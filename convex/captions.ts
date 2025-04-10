import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Add a new caption from speech-to-text processing
 * This would be called by the client-side integration with Eleven Labs
 */
export const addCaption = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"), // Who spoke
    content: v.string(), // The transcription
    startTime: v.number(), // When speech started
    endTime: v.optional(v.number()), // When speech ended
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
      throw new Error("User is not in this room");
    }
    
    const captionId = await ctx.db.insert("captions", {
      roomId: args.roomId,
      userId: args.userId,
      content: args.content,
      startTime: args.startTime,
      endTime: args.endTime,
      isProcessed: args.endTime !== undefined, // If endTime is set, caption is complete
    });
    
    return captionId;
  },
});

/**
 * Update an existing caption (e.g., when finalizing a transcription)
 */
export const updateCaption = mutation({
  args: {
    captionId: v.id("captions"),
    content: v.optional(v.string()),
    endTime: v.optional(v.number()),
    isProcessed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caption = await ctx.db.get(args.captionId);
    if (!caption) {
      throw new Error("Caption not found");
    }
    
    const updates: {
      content?: string;
      endTime?: number;
      isProcessed?: boolean;
    } = {};
    
    if (args.content !== undefined) {
      updates.content = args.content;
    }
    
    if (args.endTime !== undefined) {
      updates.endTime = args.endTime;
    }
    
    if (args.isProcessed !== undefined) {
      updates.isProcessed = args.isProcessed;
    }
    
    await ctx.db.patch(args.captionId, updates);
    
    return args.captionId;
  },
});

/**
 * Get captions for a time range in a room
 */
export const getForTimeRange = query({
  args: {
    roomId: v.id("rooms"),
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const captions = await ctx.db
      .query("captions")
      .withIndex("by_room_time", (q) => q.eq("roomId", args.roomId))
      .filter((q) => 
        q.and(
          q.gte(q.field("startTime"), args.startTime),
          q.lte(q.field("startTime"), args.endTime)
        )
      )
      .collect();
    
    // Get user info for each caption
    const userIds = [...new Set(captions.map((c) => c.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    
    const userMap = Object.fromEntries(
      users
        .filter(Boolean)
        .map((user) => [user?._id.toString(), user])
    );
    
    // Combine caption data with user info
    return captions.map((caption) => ({
      caption,
      user: userMap[caption.userId.toString()]
        ? { 
            _id: userMap[caption.userId.toString()]?._id,
            name: userMap[caption.userId.toString()]?.name,
            image: userMap[caption.userId.toString()]?.image,
          }
        : null,
    }));
  },
});

/**
 * Get the most recent captions for a room
 * Useful for showing live captions
 */
export const getRecentCaptions = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    const captions = await ctx.db
      .query("captions")
      .withIndex("by_room_time", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);
    
    // Get user info for each caption
    const userIds = [...new Set(captions.map((c) => c.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    
    const userMap = Object.fromEntries(
      users
        .filter(Boolean)
        .map((user) => [user?._id.toString(), user])
    );
    
    // Combine caption data with user info and sort by time
    return captions
      .map((caption) => ({
        caption,
        user: userMap[caption.userId.toString()]
          ? { 
              _id: userMap[caption.userId.toString()]?._id,
              name: userMap[caption.userId.toString()]?.name,
              image: userMap[caption.userId.toString()]?.image,
            }
          : null,
      }))
      .sort((a, b) => a.caption.startTime - b.caption.startTime);
  },
});

/**
 * Get captions by user in a room
 */
export const getByUser = query({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const captions = await ctx.db
      .query("captions")
      .withIndex("by_user_room", (q) => 
        q.eq("userId", args.userId).eq("roomId", args.roomId)
      )
      .order("desc")
      .collect();
    
    return captions;
  },
}); 