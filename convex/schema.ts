import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users and Authentication
  users: defineTable({
    // Authentication fields
    tokenIdentifier: v.string(), // Auth provider's unique identifier
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()), // Profile picture URL
    
    // Profile fields
    bio: v.optional(v.string()),
    
    // Status fields
    lastSeen: v.optional(v.number()),
    isOnline: v.optional(v.boolean()),
    
    // Timestamps
    createdAt: v.number(), // When the user first registered
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"])
    .index("by_online", ["isOnline"])
    // Corrected search index for user name and email
    .searchIndex("search_name_email", {
      searchField: "name", // Primary search field
      filterFields: ["email"], // Additional fields to search within
    }),
    
  // User followings (social graph)
  follows: defineTable({
    followerId: v.id("users"), // User who is following
    followingId: v.id("users"), // User being followed
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),
  
  // Audio Rooms (Sessions)
  rooms: defineTable({
    // Basic information
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal('audio'), v.literal('video')), // Add type field
    
    // Creator and timestamps
    createdBy: v.id("users"),
    createdAt: v.number(),
    
    // Room status and scheduling
    status: v.string(), // "scheduled", "live", "ended"
    scheduledFor: v.optional(v.number()), // Timestamp when scheduled to start
    startedAt: v.optional(v.number()), // Timestamp when actually started
    endedAt: v.optional(v.number()), // Timestamp when ended
    
    // Configuration
    isPrivate: v.boolean(), // Public or private (invite-only)
    accessCode: v.optional(v.string()), // Access code for private rooms
    isRecorded: v.boolean(), // Whether recording is enabled
    isDeleted: v.optional(v.boolean()), // Soft delete marker
    deletedAt: v.optional(v.number()), // When the room was deleted
    
    // Stats
    participantCount: v.optional(v.number()), // Current number of participants
    peakParticipantCount: v.optional(v.number()), // Maximum number at any point
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_scheduledFor", ["scheduledFor"])
    .index("by_status", ["status"])
    .index("by_creator", ["createdBy"])
    .index("by_visibility", ["isPrivate"])
    .index("by_deletion", ["isDeleted"])
    .index("by_type", ["type"])
    .index("by_accessCode", ["accessCode"]), // Add index for accessCode
  
  // Room participants and their roles
  roomParticipants: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    role: v.string(), // "host", "co-host", "speaker", "listener"
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    isMuted: v.boolean(), // Whether the participant is muted
    hasRaisedHand: v.optional(v.boolean()), // "Raise hand" feature
  })
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_room_user", ["roomId", "userId"])
    .index("by_room_joinedAt", ["roomId", "joinedAt"])
    .index("by_room_role", ["roomId", "role"]),
  
  // Room invitations (for private rooms)
  roomInvitations: defineTable({
    roomId: v.id("rooms"),
    invitedBy: v.id("users"),
    invitedUser: v.id("users"),
    email: v.optional(v.string()), // For inviting non-users by email
    status: v.string(), // "pending", "accepted", "declined"
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_invited_user", ["invitedUser"])
    .index("by_email", ["email"])
    .index("by_room_user", ["roomId", "invitedUser"]),
  
  // Live chat messages in rooms
  messages: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    content: v.string(),
    type: v.string(), // "text", "link", "system"
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_room_createdAt", ["roomId", "createdAt"])
    .index("by_user", ["userId"]),
  
  // Reactions to messages or in rooms
  reactions: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")), // Optional - can be a reaction to a message or to the room
    type: v.string(), // Emoji type
    createdAt: v.number(),
  })
    .index("by_room_createdAt", ["roomId", "createdAt"])
    .index("by_message", ["messageId"])
    .index("by_user_room", ["userId", "roomId"]),
  
  // Room recordings
  recordings: defineTable({
    roomId: v.id("rooms"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    storageId: v.optional(v.string()), // Reference to storage
    duration: v.optional(v.number()), // Duration in seconds
    status: v.string(), // "recording", "processing", "ready", "failed"
    url: v.optional(v.string()), // URL to access the recording
  })
    .index("by_room", ["roomId"])
    .index("by_status", ["status"]),
  
  // Captions for rooms (generated by Eleven Labs)
  captions: defineTable({
    roomId: v.id("rooms"),
    userId: v.id("users"), // Who spoke
    content: v.string(), // The caption text
    startTime: v.number(), // When caption starts
    endTime: v.optional(v.number()), // When caption ends
    isProcessed: v.boolean(), // Whether it's been processed/finalized
  })
    .index("by_room_time", ["roomId", "startTime"])
    .index("by_user_room", ["userId", "roomId"]),
  
  // Notifications for users
  notifications: defineTable({
    userId: v.id("users"), // User to notify
    type: v.string(), // "room_scheduled", "room_started", "follow", "invite", etc.
    relatedUserId: v.optional(v.id("users")), // User who triggered notification
    relatedRoomId: v.optional(v.id("rooms")), // Related room
    content: v.string(), // Notification text
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_createdAt", ["userId", "createdAt"]),

  // Video Rooms (ephemeral, identified by name)
  videoRooms: defineTable({
    name: v.string(), // Unique room name from URL
    // createdBy: v.optional(v.id("users")), // Optional: Track creator if needed
    createdAt: v.number(), // Timestamp of first join attempt
    lastActivityAt: v.number(), // Timestamp of the last known join/activity
    // participantCount: v.optional(v.number()), // Optional: Could be tracked via webhooks
  })
  .index("by_name", ["name"])
  .index("by_lastActivityAt", ["lastActivityAt"]),

  /**
   * Stores room invitations with their status and expiry information.
   * - Tracks who sent the invitation and when
   * - Handles single-use tokens with expiry
   * - Records when invitations are used
   */
  invitations: defineTable({
    // The room being invited to
    roomId: v.id("rooms"),
    // Email address of the invitee
    email: v.string(),
    // Secure random token for the invitation link
    token: v.string(),
    // Current status of the invitation
    status: v.union(
      v.literal("pending"),   // Not yet used
      v.literal("used"),      // Successfully used to join
      v.literal("expired")    // Expired without being used
    ),
    // User who created the invitation
    invitedBy: v.id("users"),
    // Timestamps
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    // Find invitation by its token (for validation)
    .index("by_token", ["token"])
    // Find active invitations for a room+email combination (prevent duplicates)
    .index("by_email_and_room", ["email", "roomId"])
    // Find all invitations for a room (for listing/cleanup)
    .index("by_room", ["roomId"])
    // Find all invitations by a user (for listing/management)
    .index("by_inviter", ["invitedBy"])
    // Find expired invitations (for cleanup)
    .index("by_expiry", ["expiresAt"])
    // Find invitations by status (for filtering/cleanup)
    .index("by_status", ["status"]),
}); 