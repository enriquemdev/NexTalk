import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send a reaction to a room (not attached to a specific message)
 */
export const sendRoomReaction = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    type: v.string(), // emoji type
  },
  handler: async (ctx, args) => {
    // Check if the user is in the room
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!participant) {
      throw new Error("You must be in the room to send a reaction");
    }
    
    // Create a reaction without a messageId to indicate it's for the room itself
    const reactionId = await ctx.db.insert("reactions", {
      roomId: args.roomId,
      userId: args.userId,
      type: args.type,
      createdAt: Date.now(),
    });
    
    return reactionId;
  },
});

/**
 * Get recent room reactions
 */
export const getRecentRoomReactions = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
    since: v.optional(v.number()), // timestamp
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    let query = ctx.db
      .query("reactions")
      .withIndex("by_room_createdAt", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("messageId"), undefined)) // Only room reactions, not message reactions
      .order("desc");
    
    if (args.since !== undefined) {
      query = query.filter((q) => q.gt(q.field("createdAt"), args.since!));
    }
    
    const reactions = await query.take(limit);
    
    // Get user info for each reaction
    const userIds = [...new Set(reactions.map((r) => r.userId))];
    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id))
    );
    
    const userMap = Object.fromEntries(
      users
        .filter(Boolean)
        .map((user) => [user?._id.toString(), user])
    );
    
    // Combine reaction data with user info
    return reactions.map((reaction) => ({
      reaction,
      user: userMap[reaction.userId.toString()]
        ? {
            _id: userMap[reaction.userId.toString()]?._id,
            name: userMap[reaction.userId.toString()]?.name,
            image: userMap[reaction.userId.toString()]?.image,
          }
        : null,
    }));
  },
});

/**
 * Get aggregated reactions by type
 */
export const getReactionCounts = query({
  args: {
    roomId: v.id("rooms"),
    timeWindow: v.optional(v.number()), // in milliseconds, e.g., 60000 for last minute
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("reactions")
      .withIndex("by_room_createdAt", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("messageId"), undefined)); // Only room reactions, not message reactions
    
    if (args.timeWindow) {
      const since = Date.now() - args.timeWindow;
      query = query.filter((q) => q.gt(q.field("createdAt"), since));
    }
    
    const reactions = await query.collect();
    
    // Group and count reactions by type
    const counts: Record<string, number> = {};
    
    for (const reaction of reactions) {
      const type = reaction.type;
      if (!counts[type]) {
        counts[type] = 0;
      }
      counts[type]++;
    }
    
    return counts;
  },
});

/**
 * Delete old reactions to keep the database clean
 * This would typically be called by a scheduled job
 */
export const cleanupOldReactions = mutation({
  args: {
    roomId: v.id("rooms"),
    olderThan: v.number(), // timestamp
  },
  handler: async (ctx, args) => {
    const oldReactions = await ctx.db
      .query("reactions")
      .withIndex("by_room_createdAt", (q) => q.eq("roomId", args.roomId))
      .filter((q) => 
        q.and(
          q.lt(q.field("createdAt"), args.olderThan),
          q.eq(q.field("messageId"), undefined) // Only clean up room reactions, not message reactions
        )
      )
      .collect();
    
    // Delete old reactions
    for (const reaction of oldReactions) {
      await ctx.db.delete(reaction._id);
    }
    
    return oldReactions.length;
  },
}); 