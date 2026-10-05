import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Context = QueryCtx | MutationCtx;
export async function requireUser(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  // Preserve the existing clerk:<subject> keys without trusting client IDs.
  const user = await ctx.db.query("users").withIndex("by_token", q =>
    q.eq("tokenIdentifier", `clerk:${identity.subject}`)).unique();
  if (!user) throw new ConvexError("USER_NOT_SYNCED");
  return user;
}
export async function requireSelf(ctx: Context, id: Id<"users">) {
  const user = await requireUser(ctx);
  if (user._id !== id) throw new ConvexError("FORBIDDEN");
  return user;
}
export async function requireRoomAccess(ctx: Context, roomId: Id<"rooms">, ownerOnly = false) {
  const user = await requireUser(ctx);
  const room = await ctx.db.get(roomId);
  if (!room || room.isDeleted) throw new ConvexError("ROOM_NOT_FOUND");
  if (room.createdBy === user._id) return { room, user };
  if (ownerOnly) throw new ConvexError("FORBIDDEN");
  const member = await ctx.db.query("roomParticipants").withIndex("by_room_user", q =>
    q.eq("roomId", roomId).eq("userId", user._id)).order("desc").first();
  if (!member || (member.leftAt !== undefined && room.status !== "ended")) {
    throw new ConvexError("FORBIDDEN");
  }
  return { room, user };
}
export async function requireAdmin(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();
  const allowed = (process.env.NEXTALK_ADMIN_USER_IDS ?? "").split(",").map(s => s.trim()).filter(Boolean);
  if (!identity || !allowed.includes(identity.subject)) throw new ConvexError("FORBIDDEN");
}
export function requireSummaryService(secret: string) {
  const expected = process.env.SUMMARY_SERVICE_SECRET;
  if (!expected || expected.length < 32 || secret.length !== expected.length) throw new ConvexError("SERVICE_UNAVAILABLE");
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ secret.charCodeAt(i);
  if (difference !== 0) throw new ConvexError("FORBIDDEN");
}
