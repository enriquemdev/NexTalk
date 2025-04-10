import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a WebRTC signaling message to a specific user
 */
export const sendSignal = mutation({
  args: {
    roomId: v.id("rooms"),
    senderUserId: v.id("users"),
    receiverUserId: v.id("users"),
    type: v.string(), // "offer", "answer", "ice-candidate"
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the users are in the same room
    const senderParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.senderUserId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    const receiverParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.receiverUserId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();

    if (!senderParticipant || !receiverParticipant) {
      throw new Error("Both sender and receiver must be in the room");
    }

    // Create the signaling message
    const signalId = await ctx.db.insert("webrtcSignaling", {
      roomId: args.roomId,
      senderUserId: args.senderUserId,
      receiverUserId: args.receiverUserId,
      type: args.type,
      payload: args.payload,
      createdAt: Date.now(),
      processed: false,
    });

    return signalId;
  },
});

/**
 * Get all pending WebRTC signaling messages for a user
 */
export const getSignals = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("webrtcSignaling")
      .withIndex("by_receiver", (q) =>
        q.eq("receiverUserId", args.userId).eq("processed", false)
      )
      .order("asc")
      .collect();

    return signals;
  },
});

/**
 * Mark a signaling message as processed
 */
export const markSignalProcessed = mutation({
  args: {
    signalId: v.id("webrtcSignaling"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.signalId, {
      processed: true,
    });
    return true;
  },
});

/**
 * Get pending WebRTC signaling messages for a user in a specific room
 */
export const getRoomSignals = query({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("webrtcSignaling")
      .withIndex("by_room_receiver", (q) =>
        q.eq("roomId", args.roomId)
         .eq("receiverUserId", args.userId)
         .eq("processed", false)
      )
      .order("asc")
      .collect();

    return signals;
  },
}); 