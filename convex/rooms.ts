import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

/**
 * List all rooms with optional filtering
 */
export const list = query({
  args: {
    status: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("rooms"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      status: v.string(),
      scheduledFor: v.optional(v.number()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      isPrivate: v.boolean(),
      isRecorded: v.boolean(),
      participantCount: v.optional(v.number()),
      peakParticipantCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    let query = ctx.db.query("rooms").withIndex("by_createdAt");
    
    // Apply filters if provided
    if (args.status !== undefined) {
      query = ctx.db.query("rooms").withIndex("by_status", q => q.eq("status", args.status as string));
    }
    
    if (args.isPrivate !== undefined) {
      query = ctx.db.query("rooms").withIndex("by_visibility", q => q.eq("isPrivate", args.isPrivate as boolean));
    }
    
    const limit = args.limit ?? 50;
    
    // Exclude deleted rooms
    return await query
      .filter(q => q.or(
        q.eq(q.field("isDeleted"), false),
        q.eq(q.field("isDeleted"), undefined)
      ))
      .order("desc")
      .take(limit);
  },
});

/**
 * Create a room
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    scheduledFor: v.optional(v.number()),
    isPrivate: v.optional(v.boolean()),
    isRecorded: v.optional(v.boolean()),
  },
  returns: v.id("rooms"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const isScheduled = args.scheduledFor && args.scheduledFor > now;
    
    // Create the room
    const roomId = await ctx.db.insert("rooms", {
      name: args.name,
      description: args.description,
      createdBy: args.userId,
      createdAt: now,
      status: isScheduled ? "scheduled" : "live",
      scheduledFor: args.scheduledFor,
      startedAt: isScheduled ? undefined : now,
      isPrivate: args.isPrivate ?? false,
      isRecorded: args.isRecorded ?? false,
      participantCount: isScheduled ? 0 : 1,
      peakParticipantCount: isScheduled ? 0 : 1,
    });
    
    // If the room is live now, add the creator as a host participant
    if (!isScheduled) {
      await ctx.db.insert("roomParticipants", {
        roomId,
        userId: args.userId,
        role: "host",
        joinedAt: now,
        isMuted: false,
      });
      
      // If recording is enabled, create a recording entry
      if (args.isRecorded) {
        await ctx.db.insert("recordings", {
          roomId,
          startedAt: now,
          status: "recording",
        });
      }
    }
    
    return roomId;
  },
});

/**
 * Get a room by ID
 */
export const get = query({
  args: { 
    roomId: v.id("rooms"),
    includeDeleted: v.optional(v.boolean()) 
  },
  returns: v.union(
    v.object({
      _id: v.id("rooms"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      createdAt: v.number(),
      status: v.string(),
      scheduledFor: v.optional(v.number()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      isPrivate: v.boolean(),
      isRecorded: v.boolean(),
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
      participantCount: v.optional(v.number()),
      peakParticipantCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    
    // If no room found, return null
    if (!room) return null;
    
    // If room is deleted and includeDeleted is not true, return null
    if (room.isDeleted && !args.includeDeleted) return null;
    
    return room;
  },
});

/**
 * List all scheduled rooms
 */
export const listScheduled = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit ?? 20;
    
    return await ctx.db
      .query("rooms")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .filter((q) => q.gt(q.field("scheduledFor"), now))
      .order("asc")
      .take(limit);
  },
});

/**
 * List rooms created by a specific user
 */
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    
    return await ctx.db
      .query("rooms")
      .withIndex("by_creator", (q) => q.eq("createdBy", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Start a scheduled room
 */
export const startRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the user is the room creator
    if (room.createdBy !== args.userId) {
      throw new Error("Only the room creator can start the room");
    }
    
    // Check if the room is in scheduled status
    if (room.status !== "scheduled") {
      throw new Error("Room is not in scheduled status");
    }
    
    const now = Date.now();
    
    // Update room status to live
    await ctx.db.patch(args.roomId, {
      status: "live",
      startedAt: now,
      participantCount: 1,
      peakParticipantCount: 1,
    });
    
    // Add the creator as a host participant
    await ctx.db.insert("roomParticipants", {
      roomId: args.roomId,
      userId: args.userId,
      role: "host",
      joinedAt: now,
      isMuted: false,
    });
    
    // If recording is enabled, create a recording entry
    if (room.isRecorded) {
      await ctx.db.insert("recordings", {
        roomId: args.roomId,
        startedAt: now,
        status: "recording",
      });
    }
    
    // Create notifications for followers
    // This would ideally be handled by a Convex schedule/cron job
    // but we'll use a simpler approach for the MVP
    
    return args.roomId;
  },
});

/**
 * End a live room
 */
export const endRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the user is the room creator
    if (room.createdBy !== args.userId) {
      throw new Error("Only the room creator can end the room");
    }
    
    // Check if the room is in live status
    if (room.status !== "live") {
      throw new Error("Room is not live");
    }
    
    const now = Date.now();
    
    // Update room status to ended
    await ctx.db.patch(args.roomId, {
      status: "ended",
      endedAt: now,
    });
    
    // Mark all participants as having left the room
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();
    
    for (const participant of participants) {
      await ctx.db.patch(participant._id, {
        leftAt: now,
      });
    }
    
    // End any active recordings
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "recording"))
      .collect();
    
    for (const recording of recordings) {
      await ctx.db.patch(recording._id, {
        endedAt: now,
        status: "processing",
      });
    }
    
    return args.roomId;
  },
});

/**
 * Join a room as a participant
 */
export const joinRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the room is live
    if (room.status !== "live") {
      throw new Error("Room is not live");
    }
    
    // Check if room is private and if user has access
    if (room.isPrivate) {
      // Check if user is the room creator
      if (room.createdBy !== args.userId) {
        // Check if user has an invitation
        const invitation = await ctx.db
          .query("roomInvitations")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", args.roomId).eq("invitedUser", args.userId)
          )
          .filter((q) => q.eq(q.field("status"), "accepted"))
          .first();
        
        if (!invitation) {
          throw new Error("This is a private room and you don't have access");
        }
      }
    }
    
    // Check if user is already in the room
    const existingParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (existingParticipant) {
      return existingParticipant._id;
    }
    
    const now = Date.now();
    
    // Determine role (host, co-host, listener)
    let role = "listener";
    if (room.createdBy === args.userId) {
      role = "host";
    }
    
    // Add user as participant
    const participantId = await ctx.db.insert("roomParticipants", {
      roomId: args.roomId,
      userId: args.userId,
      role,
      joinedAt: now,
      isMuted: true, // Start muted by default except for host
      hasRaisedHand: false,
    });
    
    // Update room participant count
    const currentCount = room.participantCount ?? 0;
    const newCount = currentCount + 1;
    const peakCount = Math.max(newCount, room.peakParticipantCount ?? 0);
    
    await ctx.db.patch(args.roomId, {
      participantCount: newCount,
      peakParticipantCount: peakCount,
    });
    
    return participantId;
  },
});

/**
 * Get room participants
 */
export const getParticipants = query({
  args: { roomId: v.id("rooms") },
  returns: v.array(
    v.object({
      _id: v.id("roomParticipants"),
      _creationTime: v.number(),
      roomId: v.id("rooms"),
      userId: v.id("users"),
      role: v.string(),
      joinedAt: v.number(),
      leftAt: v.optional(v.number()),
      isMuted: v.boolean(),
      hasRaisedHand: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    
    return participants;
  },
});

/**
 * Leave a room
 */
export const leaveRoom = mutation({
  args: {
    participantId: v.id("roomParticipants"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    
    // Mark the participant as having left
    await ctx.db.patch(args.participantId, {
      leftAt: Date.now(),
    });
    
    // Update the room's participant count
    const room = await ctx.db.get(participant.roomId);
    if (room) {
      const currentCount = room.participantCount ?? 0;
      if (currentCount > 0) {
        await ctx.db.patch(participant.roomId, {
          participantCount: currentCount - 1,
        });
      }
    }
    
    return args.participantId;
  },
});

/**
 * Change a participant's role (host, co-host, speaker, listener)
 */
export const changeParticipantRole = mutation({
  args: {
    roomId: v.id("rooms"),
    participantId: v.id("users"),
    requestedBy: v.id("users"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if the requester is host or co-host
    const requesterParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.requestedBy)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!requesterParticipant || 
        (requesterParticipant.role !== "host" && requesterParticipant.role !== "co-host")) {
      throw new Error("Only hosts and co-hosts can change roles");
    }
    
    // Find the target participant
    const targetParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.participantId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!targetParticipant) {
      throw new Error("Participant not found");
    }
    
    // Co-hosts can only change speakers and listeners
    if (requesterParticipant.role === "co-host" && 
        (targetParticipant.role === "host" || targetParticipant.role === "co-host")) {
      throw new Error("Co-hosts cannot change the role of hosts or other co-hosts");
    }
    
    // Validate the requested role
    const validRoles = ["host", "co-host", "speaker", "listener"];
    if (!validRoles.includes(args.newRole)) {
      throw new Error("Invalid role");
    }
    
    // Special case: there must always be exactly one host
    if (targetParticipant.role === "host" && args.newRole !== "host") {
      // If demoting the host, another person must become host
      if (requesterParticipant.role !== "host") {
        throw new Error("Cannot demote the host if you are not taking over as host");
      }
      
      // Update requester to host
      await ctx.db.patch(requesterParticipant._id, {
        role: "host",
      });
    }
    
    // If setting a new host, demote the current host
    if (args.newRole === "host" && targetParticipant.role !== "host") {
      // Find current host
      const currentHost = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room_role", (q) =>
          q.eq("roomId", args.roomId).eq("role", "host")
        )
        .filter((q) => q.eq(q.field("leftAt"), undefined))
        .first();
      
      if (currentHost) {
        await ctx.db.patch(currentHost._id, {
          role: "co-host",
        });
      }
    }
    
    // Update the target participant's role
    await ctx.db.patch(targetParticipant._id, {
      role: args.newRole,
      // If they're becoming a speaker or above, unmute them
      isMuted: args.newRole === "listener" ? true : targetParticipant.isMuted,
      // Clear raised hand if being promoted
      hasRaisedHand: args.newRole !== "listener" ? false : targetParticipant.hasRaisedHand,
    });
    
    return true;
  },
});

/**
 * Mute or unmute a participant
 */
export const toggleMute = mutation({
  args: {
    participantId: v.id("roomParticipants"),
    isMuted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    
    await ctx.db.patch(args.participantId, {
      isMuted: args.isMuted,
    });
    
    return true;
  },
});

/**
 * Raise or lower hand
 */
export const toggleRaiseHand = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
    isRaised: v.boolean(),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.userId)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!participant) {
      throw new Error("Participant not found");
    }
    
    await ctx.db.patch(participant._id, {
      hasRaisedHand: args.isRaised,
    });
    
    return true;
  },
});

/**
 * Invite a user to a private room
 */
export const inviteToRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    invitedBy: v.id("users"),
    invitedUser: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Check if the inviter is in the room as host or co-host
    const inviterParticipant = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("userId", args.invitedBy)
      )
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .first();
    
    if (!inviterParticipant || 
        (inviterParticipant.role !== "host" && inviterParticipant.role !== "co-host")) {
      throw new Error("Only hosts and co-hosts can invite users");
    }
    
    // Check if the invitation already exists
    const existingInvitation = await ctx.db
      .query("roomInvitations")
      .withIndex("by_room_user", (q) =>
        q.eq("roomId", args.roomId).eq("invitedUser", args.invitedUser)
      )
      .first();
    
    if (existingInvitation) {
      // If declined, update to pending
      if (existingInvitation.status === "declined") {
        await ctx.db.patch(existingInvitation._id, {
          status: "pending",
          invitedBy: args.invitedBy,
          createdAt: Date.now(),
        });
      }
      return existingInvitation._id;
    }
    
    // Create a new invitation
    const invitationId = await ctx.db.insert("roomInvitations", {
      roomId: args.roomId,
      invitedBy: args.invitedBy,
      invitedUser: args.invitedUser,
      status: "pending",
      createdAt: Date.now(),
    });
    
    // Create a notification for the invited user
    await ctx.db.insert("notifications", {
      userId: args.invitedUser,
      type: "room_invite",
      relatedUserId: args.invitedBy,
      relatedRoomId: args.roomId,
      content: "You've been invited to join a room",
      isRead: false,
      createdAt: Date.now(),
    });
    
    return invitationId;
  },
});

/**
 * Respond to a room invitation
 */
export const respondToInvitation = mutation({
  args: {
    invitationId: v.id("roomInvitations"),
    response: v.string(), // "accepted" or "declined"
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been responded to");
    }
    
    // Update the invitation status
    await ctx.db.patch(args.invitationId, {
      status: args.response,
    });
    
    // If accepted, check if the room is live and automatically join
    if (args.response === "accepted") {
      const room = await ctx.db.get(invitation.roomId);
      if (room && room.status === "live") {
        // Check if user is already in the room
        const existingParticipant = await ctx.db
          .query("roomParticipants")
          .withIndex("by_room_user", (q) =>
            q.eq("roomId", invitation.roomId).eq("userId", invitation.invitedUser)
          )
          .filter((q) => q.eq(q.field("leftAt"), undefined))
          .first();
        
        if (!existingParticipant) {
          // Add user as participant with listener role
          await ctx.db.insert("roomParticipants", {
            roomId: invitation.roomId,
            userId: invitation.invitedUser,
            role: "listener",
            joinedAt: Date.now(),
            isMuted: true,
            hasRaisedHand: false,
          });
          
          // Update room participant count
          const currentCount = room.participantCount ?? 0;
          const newCount = currentCount + 1;
          const peakCount = Math.max(newCount, room.peakParticipantCount ?? 0);
          
          await ctx.db.patch(invitation.roomId, {
            participantCount: newCount,
            peakParticipantCount: peakCount,
          });
        }
      }
    }
    
    return true;
  },
});

/**
 * Delete a room (soft delete)
 */
export const deleteRoom = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    
    // Verify the user is the room creator (only creators can delete rooms)
    if (room.createdBy !== args.userId) {
      throw new Error("Only the room creator can delete a room");
    }
    
    const now = Date.now();
    
    // First, mark all participants as having left the room
    const participants = await ctx.db
      .query("roomParticipants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("leftAt"), undefined))
      .collect();
    
    console.log(`Removing ${participants.length} participants from room ${args.roomId}`);
    
    for (const participant of participants) {
      await ctx.db.patch(participant._id, {
        leftAt: now,
      });
    }
    
    // End any active recordings
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .filter((q) => q.eq(q.field("status"), "recording"))
      .collect();
    
    for (const recording of recordings) {
      await ctx.db.patch(recording._id, {
        endedAt: now,
        status: "processing",
      });
    }
    
    // Mark all webRTC signaling messages as processed
    const signals = await ctx.db
      .query("webrtcSignaling")
      .withIndex("by_room_receiver")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .collect();
    
    for (const signal of signals) {
      await ctx.db.patch(signal._id, {
        processed: true,
      });
    }
    
    // Mark the room as deleted (soft delete)
    await ctx.db.patch(args.roomId, {
      isDeleted: true,
      deletedAt: now,
      status: "ended", // Ensure the room is marked as ended
      endedAt: room.endedAt || now,
      participantCount: 0,
    });
    
    return true;
  },
});

const BATCH_SIZE = 100; // Number of rooms to delete per batch

/**
 * Internal Mutation: Deletes a batch of rooms and their related data.
 * This is designed to be called repeatedly by an action.
 */
export const internalDeleteRoomBatch = internalMutation({
  args: { roomIds: v.array(v.id("rooms")) },
  handler: async (ctx, { roomIds }) => {
    console.log(`Deleting batch of ${roomIds.length} rooms...`);
    for (const roomId of roomIds) {
      // --- Delete Related Data First --- 
      
      // 1. Delete Participants
      const participants = await ctx.db
        .query("roomParticipants")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      await Promise.all(participants.map(p => ctx.db.delete(p._id)));
      console.log(`Deleted ${participants.length} participants for room ${roomId}`);

      // 2. Delete Messages (if applicable)
      // Add similar logic if you have a messages table related to rooms
      // const messages = await ctx.db.query("messages")... 
      // await Promise.all(messages.map(m => ctx.db.delete(m._id)));

      // 3. Delete Invitations (if applicable)
      // const invitations = await ctx.db.query("roomInvitations")...
      // await Promise.all(invitations.map(i => ctx.db.delete(i._id)));

      // --- Delete the Room Itself --- 
      await ctx.db.delete(roomId);
      console.log(`Deleted room ${roomId}`);
    }
    console.log(`Finished deleting batch of ${roomIds.length} rooms.`);
  },
});

/**
 * Internal Action: Fetches and deletes all rooms in batches.
 */
export const deleteAllRoomsAction = internalAction({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    console.log("Starting deleteAllRoomsAction...");
    const paginationOpts = { numItems: BATCH_SIZE, cursor: cursor ?? null };
    
    const results = await ctx.runQuery(internal.rooms.getAllRoomsInternal, { paginationOpts });

    if (results.page.length > 0) {
      const roomIds = results.page.map((room: Doc<"rooms">) => room._id);
      console.log(`Found ${roomIds.length} rooms in this batch. Triggering delete mutation...`);
      await ctx.runMutation(internal.rooms.internalDeleteRoomBatch, { roomIds });

      // Schedule the next batch if not done
      if (!results.isDone) {
        console.log("Scheduling next batch deletion...");
        await ctx.scheduler.runAfter(0, internal.rooms.deleteAllRoomsAction, { cursor: results.continueCursor });
      } else {
        console.log("All rooms processed for deletion.");
      }
    } else {
      console.log("No more rooms found to delete.");
    }
    
    console.log("Finished deleteAllRoomsAction execution.");
    return null; // Actions must return a value or null
  },
});

/**
 * Internal Query: Helper to get all rooms for the cleanup action.
 */
export const getAllRoomsInternal = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    // Simply fetches all rooms regardless of isDeleted or other status for cleanup
    return await ctx.db.query("rooms").paginate(args.paginationOpts);
  },
});

/**
 * Public Mutation: Triggered by the client to start the room cleanup process.
 * Requires user to be authenticated.
 */
export const triggerDeleteAllRooms = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in to perform this action.");
    }
    
    // Optionally, add admin check here if needed:
    // const user = await ctx.db.query('users').withIndex('by_token', q => q.eq('tokenIdentifier', identity.tokenIdentifier)).unique();
    // if (user?.role !== 'admin') { 
    //   throw new Error("Forbidden: Only admins can delete all rooms.");
    // }

    console.log(`User ${identity.subject} triggered deleteAllRooms action.`);
    
    // Schedule the action to run immediately
    await ctx.scheduler.runAfter(0, internal.rooms.deleteAllRoomsAction, {});
    
    return { success: true, message: "Room cleanup process started." };
  },
}); 