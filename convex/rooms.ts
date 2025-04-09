import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    
    return await query.order("desc").take(limit);
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
  args: { roomId: v.id("rooms") },
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
      participantCount: v.optional(v.number()),
      peakParticipantCount: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
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