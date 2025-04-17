import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Store a room summary
 */
export const storeSummary = mutation({
  args: {
    roomId: v.id("rooms"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if a summary already exists
    const existingSummary = await ctx.db
      .query("summaries")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    if (existingSummary) {
      // Update existing summary
      await ctx.db.patch(existingSummary._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return existingSummary._id;
    }

    // Create new summary
    const summaryId = await ctx.db.insert("summaries", {
      roomId: args.roomId,
      content: args.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return summaryId;
  },
});

/**
 * Get a room summary
 */
export const getSummary = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("summaries")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .first();

    return summary;
  },
}); 