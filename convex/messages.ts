import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Send a message to a room
 */
export const send = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    content: v.string(),
    type: v.optional(v.string()),
  },
  returns: v.id("messages"),
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
      throw new Error("You must be in the room to send a message");
    }
    
    const messageId = await ctx.db.insert("messages", {
      roomId: args.roomId,
      userId: args.userId,
      content: args.content,
      type: args.type ?? "text",
      createdAt: Date.now(),
      isDeleted: false,
    });
    
    return messageId;
  },
});

/**
 * List messages for a room, joined with basic user info.
 */
export const listMessagesWithUsers = query({
  args: { 
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Fetch messages ordered by creation time
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_createdAt", (q) => q.eq("roomId", args.roomId))
      .order("asc")
      .take(limit);

    // Fetch user details for each message
    const messagesWithUsers = await Promise.all(
      messages.map(async (message) => {
        const user = await ctx.db.get(message.userId);
        return {
          ...message,
          user: user
             ? { _id: user._id, name: user.name, image: user.image }
             : null, 
        };
      })
    );

    return messagesWithUsers;
  },
});

/**
 * Get recent messages for a room
 */
export const getByRoom = query({
  args: {
    roomId: v.id("rooms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const query = ctx.db
      .query("messages")
      .withIndex("by_room_createdAt", (q) => q.eq("roomId", args.roomId))
      .order("asc")
      .filter((q) => q.eq(q.field("isDeleted"), false));
    
    const messages = await query.take(limit);
    
    // Get user info for each message
    const userIds = [...new Set(messages.map((m) => m.userId))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    
    const userMap = Object.fromEntries(
      users
        .filter(Boolean)
        .map((user) => [user?._id.toString(), user])
    );
    
    // Combine message data with user info
    return messages.map((message) => ({
      message,
      user: userMap[message.userId.toString()] 
        ? {
            _id: userMap[message.userId.toString()]?._id,
            name: userMap[message.userId.toString()]?.name,
            image: userMap[message.userId.toString()]?.image,
          }
        : null,
    }));
  },
});

/**
 * Delete a message
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    
    // Only the message author or a room host/co-host can delete messages
    if (message.userId !== args.userId) {
      // Check if the user is a host or co-host
      const room = await ctx.db.get(message.roomId);
      if (!room) {
        throw new Error("Room not found");
      }
      
      const participant = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_user", (q) =>
          q.eq("roomId", message.roomId).eq("userId", args.userId)
        )
        .filter((q) => q.eq(q.field("leftAt"), undefined))
        .first();
      
      if (!participant || (participant.role !== "host" && participant.role !== "co-host")) {
        throw new Error("You don't have permission to delete this message");
      }
    }
    
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
    });
    
    return true;
  },
});

/**
 * Add a reaction to a message
 */
export const addReaction = mutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    userId: v.id("users"),
    type: v.string(), // Emoji type
  },
  handler: async (ctx, args) => {
    // Check if user is in the room
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!participant) {
      throw new Error("You must be in the room to react to messages");
    }
    
    // Check if the reaction already exists
    const existingReaction = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();
    
    if (existingReaction) {
      // Remove the reaction if it already exists (toggle behavior)
      await ctx.db.delete(existingReaction._id);
      return null;
    } else {
      // Add new reaction
      const reactionId = await ctx.db.insert("reactions", {
        roomId: args.roomId,
        messageId: args.messageId,
        userId: args.userId,
        type: args.type,
        createdAt: Date.now(),
      });
      
      return reactionId;
    }
  },
});

/**
 * Get reactions for a message
 */
export const getReactions = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
    
    // Group reactions by type
    const groupedReactions: Record<string, { count: number; users: Id<"users">[] }> = {};
    
    for (const reaction of reactions) {
      const type = reaction.type;
      if (!groupedReactions[type]) {
        groupedReactions[type] = {
          count: 0,
          users: [],
        };
      }
      
      groupedReactions[type].count++;
      groupedReactions[type].users.push(reaction.userId);
    }
    
    return groupedReactions;
  },
}); 