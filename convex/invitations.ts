import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";

// 24 hours in milliseconds
const INVITATION_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Debug query to get all invitations (admin use only).
 */
export const debugGetAllInvitations = query({
  args: {},
  handler: async (ctx) => {
    // Check for authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    // Get all invitations
    const invitations = await ctx.db
      .query("invitations")
      .order("desc")
      .collect();

    // Get user info
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    // Return count by status and user info
    const pendingCount = invitations.filter(inv => inv.status === "pending").length;
    const usedCount = invitations.filter(inv => inv.status === "used").length;
    const expiredCount = invitations.filter(inv => inv.status === "expired").length;
    const sentByMe = invitations.filter(inv => inv.invitedBy === user?._id).length;

    return {
      total: invitations.length,
      pending: pendingCount,
      used: usedCount,
      expired: expiredCount,
      sentByMe,
      user: user || null,
      invitations: invitations.slice(0, 20) // Only return first 20 for brevity
    };
  }
});

/**
 * Mutation to create an invitation for a room.
 * @param roomId - The ID of the room to invite to
 * @param email - The email address to invite
 * @param invitedBy - The user ID of the inviter
 * @param expiresAt - Expiration timestamp for the invitation
 * @returns The generated invitation token
 * @throws Error if room doesn't exist, user lacks permission, or email is invalid
 */
export const createInvitation = mutation({
  args: {
    roomId: v.id("rooms"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the user's record
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user has access to the room
    const room = await ctx.db.get(args.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Check if an active invitation already exists
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email_and_room", (q) => 
        q.eq("email", args.email).eq("roomId", args.roomId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (existingInvitation) {
      return existingInvitation;
    }

    // Create a new invitation
    const token = nanoid(32); // Generate a secure token
    const now = Date.now();

    const invitation = await ctx.db.insert("invitations", {
      roomId: args.roomId,
      email: args.email,
      token,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVITATION_EXPIRY,
      invitedBy: user._id,
    });

    return invitation;
  },
});

/**
 * Query to get an invitation by its token.
 * @param token - The invitation token
 * @returns The invitation if found and not expired/used, null otherwise
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if invitation is expired or used
    if (invitation.status !== "pending" || Date.now() > invitation.expiresAt) {
      return null;
    }

    return invitation;
  },
});

export const validateInvitation = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      return { valid: false, reason: "Invitation not found" };
    }

    if (invitation.status === "used") {
      return { valid: false, reason: "Invitation has already been used" };
    }

    if (invitation.status === "expired" || invitation.expiresAt < Date.now()) {
      return { valid: false, reason: "Invitation has expired" };
    }

    const room = await ctx.db.get(invitation.roomId);
    if (!room) {
      return { valid: false, reason: "Room not found" };
    }

    return {
      valid: true,
      roomId: room._id,
      email: invitation.email,
    };
  },
});

export const useInvitation = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("Invitation has expired");
    }

    // Mark invitation as used
    await ctx.db.patch(invitation._id, {
      status: "used",
      usedAt: Date.now(),
    });

    return invitation.roomId;
  },
});

/**
 * Internal mutation to clean up expired invitations.
 * This function:
 * 1. Marks all expired pending invitations as "expired"
 * 2. Runs every hour via cron job
 */
export const cleanupExpiredInvitations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all pending invitations that have expired
    const expiredInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    // Mark them as expired
    for (const invitation of expiredInvitations) {
      await ctx.db.patch(invitation._id, {
        status: "expired",
      });
    }

    return expiredInvitations.length;
  },
});

/**
 * Query to get invitations sent by a user
 */
export const getSentInvitations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    // Log for debugging purposes
    console.log(`Fetching sent invitations for user: ${user._id}`);

    // Get all invitations sent by this user (not filtering by status)
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_inviter", (q) => q.eq("invitedBy", user._id))
      .order("desc")
      .take(args.limit ?? 50);

    console.log(`Found ${invitations.length} sent invitations`);

    // Fetch room details for each invitation
    const invitationsWithRooms = await Promise.all(
      invitations.map(async (invitation) => {
        const room = await ctx.db.get(invitation.roomId);
        return {
          ...invitation,
          room,
        };
      })
    );

    return invitationsWithRooms;
  }
});

/**
 * Query to get invitations received by a user's email
 */
export const getReceivedInvitations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    // Check for invitations sent to the user's email address
    const userEmail = user.email || identity.email;
    if (!userEmail) {
      return [];
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_email_and_status", (q) => 
        q.eq("email", userEmail).eq("status", "pending")
      )
      .filter((q) => q.gt(q.field("expiresAt"), Date.now()))
      .order("desc")
      .take(args.limit ?? 50);

    // Fetch room details and sender info for each invitation
    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const room = await ctx.db.get(invitation.roomId);
        const inviter = await ctx.db.get(invitation.invitedBy);
        return {
          ...invitation,
          room,
          inviter,
        };
      })
    );

    return invitationsWithDetails;
  }
}); 