import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Start recording a room
 * This would be called when a host enables recording for a live room
 */
export const startRecording = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"), // User requesting the recording
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the user is a host or co-host
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!participant || (participant.role !== "host" && participant.role !== "co-host")) {
      throw new Error("Only hosts and co-hosts can start recording");
    }
    
    // Check if room is already being recorded
    const activeRecording = await ctx.db
      .query("recordings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "recording"))
      .first();
    
    if (activeRecording) {
      return activeRecording._id; // Already recording
    }
    
    // Start a new recording
    const now = Date.now();
    const recordingId = await ctx.db.insert("recordings", {
      roomId: args.roomId,
      startedAt: now,
      status: "recording",
    });
    
    // Update the room's isRecorded status
    await ctx.db.patch(args.roomId, {
      isRecorded: true,
    });
    
    return recordingId;
  },
});

/**
 * Stop recording a room
 */
export const stopRecording = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the user is a host or co-host
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!participant || (participant.role !== "host" && participant.role !== "co-host")) {
      throw new Error("Only hosts and co-hosts can stop recording");
    }
    
    // Find the active recording
    const activeRecording = await ctx.db
      .query("recordings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "recording"))
      .first();
    
    if (!activeRecording) {
      throw new Error("No active recording found");
    }
    
    const now = Date.now();
    const duration = now - activeRecording.startedAt;
    
    // Update the recording
    await ctx.db.patch(activeRecording._id, {
      endedAt: now,
      duration,
      status: "processing", // This would trigger background processing in a real implementation
    });
    
    return activeRecording._id;
  },
});

/**
 * List recordings for a room
 */
export const listByRoom = query({
  args: {
    roomId: v.id("rooms"),
  },
  handler: async (ctx, args) => {
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    
    return recordings;
  },
});

/**
 * Get a specific recording
 */
export const get = query({
  args: {
    recordingId: v.id("recordings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.recordingId);
  },
});

/**
 * Update recording status after processing
 * This would typically be called by a background job that processes the recording
 */
export const updateStatus = mutation({
  args: {
    recordingId: v.id("recordings"),
    status: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const recording = await ctx.db.get(args.recordingId);
    if (!recording) {
      throw new Error("Recording not found");
    }
    
    const updates: { status: string; url?: string } = {
      status: args.status,
    };
    
    if (args.url) {
      updates.url = args.url;
    }
    
    await ctx.db.patch(args.recordingId, updates);
    
    return args.recordingId;
  },
}); 