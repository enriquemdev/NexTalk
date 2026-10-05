import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRoomAccess, requireSummaryService } from "./access";

const MAX_SOURCE_CHARS = 30000;
const MAX_SUMMARY_CHARS = 12000;
const DAY = 24 * 60 * 60 * 1000;
const summaryValue = v.object({ content: v.string(), updatedAt: v.number(), model: v.optional(v.string()), sourceCount: v.optional(v.number()), truncated: v.optional(v.boolean()) });
export const getSummary = query({
  args: { roomId: v.id("rooms") }, returns: v.union(summaryValue, v.null()),
  handler: async (ctx, { roomId }) => {
    await requireRoomAccess(ctx, roomId);
    const summary = await ctx.db.query("summaries").withIndex("by_room", q => q.eq("roomId", roomId)).unique();
    if (!summary) return null;
    return { content: summary.content, updatedAt: summary.updatedAt, model: summary.model, sourceCount: summary.sourceCount, truncated: summary.truncated };
  },
});
export const reserve = mutation({
  args: { roomId: v.id("rooms"), serviceSecret: v.string(), model: v.string() },
  returns: v.object({ runId: v.id("summaryRuns"), source: v.string(), sourceCount: v.number(), truncated: v.boolean() }),
  handler: async (ctx, args) => {
    requireSummaryService(args.serviceSecret);
    const { room, user } = await requireRoomAccess(ctx, args.roomId, true);
    if (!args.model || args.model.length > 100) throw new ConvexError("INVALID_MODEL");
    const now = Date.now();
    // Queries and insertion share one transaction, including under concurrent requests.
    const globalRuns = await ctx.db.query("summaryRuns").withIndex("by_createdAt", q => q.gte("createdAt", now - DAY)).take(100);
    const userRuns = await ctx.db.query("summaryRuns").withIndex("by_user_createdAt", q => q.eq("userId", user._id).gte("createdAt", now - DAY)).take(10);
    const recentRoom = await ctx.db.query("summaryRuns").withIndex("by_room_createdAt", q => q.eq("roomId", args.roomId).gte("createdAt", now - 60000)).first();
    if (globalRuns.length >= 100 || userRuns.length >= 10 || recentRoom) throw new ConvexError("RATE_LIMITED");
    const messages = await ctx.db.query("messages").withIndex("by_room_createdAt", q => q.eq("roomId", room._id)).order("desc").take(101);
    const captions = await ctx.db.query("captions").withIndex("by_room_time", q => q.eq("roomId", room._id)).order("desc").take(101);
    const entries = [
      ...messages.filter(m => !m.isDeleted && m.content.trim()).slice(0, 100).map(m => ({ time: m.createdAt, content: m.content, type: "message" })),
      ...captions.filter(c => c.isProcessed && c.content.trim()).slice(0, 100).map(c => ({ time: c.startTime, content: c.content, type: "caption" })),
    ].sort((a, b) => a.time - b.time);
    if (!entries.length) throw new ConvexError("NO_CONTENT");
    let source = "";
    let sourceCount = 0;
    let truncated = messages.length > 100 || captions.length > 100;
    for (const entry of entries) {
      const line = JSON.stringify({ type: entry.type, timestamp: entry.time, content: entry.content }) + "\n";
      if (source.length + line.length > MAX_SOURCE_CHARS) { truncated = true; break; }
      source += line;
      sourceCount++;
    }
    if (!sourceCount) throw new ConvexError("CONTENT_TOO_LARGE");
    const runId = await ctx.db.insert("summaryRuns", { roomId: room._id, userId: user._id, createdAt: now, state: "pending", model: args.model, sourceCount, truncated });
    return { runId, source, sourceCount, truncated };
  },
});
export const finish = mutation({
  args: { runId: v.id("summaryRuns"), serviceSecret: v.string(), content: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireSummaryService(args.serviceSecret);
    const run = await ctx.db.get(args.runId);
    if (!run) throw new ConvexError("RUN_NOT_FOUND");
    await requireRoomAccess(ctx, run.roomId, true);
    if (run.state !== "pending") throw new ConvexError("RUN_ALREADY_FINISHED");
    if (args.content === null) {
      await ctx.db.patch(run._id, { state: "failed" });
      return null;
    }
    if (Date.now() - run.createdAt > 120000 || !args.content.trim() || args.content.length > MAX_SUMMARY_CHARS) throw new ConvexError("INVALID_SUMMARY");
    const newest = await ctx.db.query("summaryRuns").withIndex("by_room_createdAt", q => q.eq("roomId", run.roomId)).order("desc").first();
    if (newest?._id !== run._id) throw new ConvexError("STALE_RUN");
    const existing = await ctx.db.query("summaries").withIndex("by_room", q => q.eq("roomId", run.roomId)).unique();
    const fields = { content: args.content, updatedAt: Date.now(), model: run.model, sourceCount: run.sourceCount, truncated: run.truncated };
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("summaries", { ...fields, roomId: run.roomId, createdAt: Date.now() });
    await ctx.db.patch(run._id, { state: "saved" });
    return null;
  },
});
