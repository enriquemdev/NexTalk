import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes - consider a room inactive after this duration

/**
 * Mutation: Ensures a video room record exists and updates its activity timestamp.
 * Called when a user attempts to join a video room.
 * Returns the ID of the existing or newly created video room record.
 */
export const ensureVideoRoomExists = mutation({
  args: {
    roomName: v.string(),
    // userId: v.optional(v.id("users")) // Pass userId if you want to track creator
  },
  handler: async (ctx, { roomName }): Promise<Id<"videoRooms">> => {
    if (!roomName || roomName.trim().length === 0) {
      throw new Error("Video room name cannot be empty.");
    }

    const now = Date.now();

    // Check if room already exists
    const existingRoom = await ctx.db
      .query("videoRooms")
      .withIndex("by_name", (q) => q.eq("name", roomName))
      .unique();

    if (existingRoom) {
      // Update last activity timestamp
      await ctx.db.patch(existingRoom._id, { lastActivityAt: now });
      console.log(`Updated activity for video room: ${roomName}`);
      return existingRoom._id;
    } else {
      // Create new video room record
      console.log(`Creating new video room record: ${roomName}`);
      const newRoomId = await ctx.db.insert("videoRooms", {
        name: roomName,
        createdAt: now,
        lastActivityAt: now,
        // createdBy: userId // Uncomment if tracking creator
      });
      return newRoomId;
    }
  },
});

/**
 * Query: Lists recently active video rooms.
 * Filters rooms based on the lastActivityAt timestamp.
 */
export const listActiveVideoRooms = query({
  args: {},
  handler: async (ctx): Promise<Doc<"videoRooms">[]> => {
    const now = Date.now();
    const cutoffTime = now - ACTIVITY_TIMEOUT_MS;

    // Query rooms that were active within the timeout period
    const activeRooms = await ctx.db
      .query("videoRooms")
      .withIndex("by_lastActivityAt", (q) => q.gt("lastActivityAt", cutoffTime))
      .order("desc") // Show most recently active first
      .take(50); // Limit the number of rooms returned
      
    console.log(`Found ${activeRooms.length} active video rooms.`);
    return activeRooms;
  },
}); 