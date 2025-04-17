import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Create or update a user when they log in
 */
export const createOrUpdate = mutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = args.tokenIdentifier;

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name ?? existingUser.name,
        email: args.email ?? existingUser.email,
        image: args.image ?? existingUser.image,
        lastSeen: Date.now(),
        isOnline: true,
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        tokenIdentifier: identity,
        name: args.name,
        email: args.email,
        image: args.image,
        lastSeen: Date.now(),
        isOnline: true,
        createdAt: Date.now(),
      });
      return userId;
    }
  },
});

/**
 * Get the current user by their token identifier
 */
export const getByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .first();

    return user;
  },
});

/**
 * Get a user by their ID
 */
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update a user's profile
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...profile } = args;
    await ctx.db.patch(userId, profile);
    return userId;
  },
});

/**
 * Update a user's online status
 */
export const updateStatus = mutation({
  args: {
    userId: v.id("users"),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      isOnline: args.isOnline,
      lastSeen: Date.now(),
    });
  },
});

/**
 * Search for users by name or email using the search index.
 */
export const searchUsers = query({
  args: {
    searchQuery: v.string(),
    limit: v.optional(v.number()), // Optional limit for results
  },
  handler: async (ctx, args) => {
    // If the search query is empty, return no results
    if (args.searchQuery === "") {
      return [];
    }

    // Use the search index to find users matching the query in name or email
    const users = await ctx.db
      .query("users")
      .withSearchIndex("search_name_email", (q) =>
        q.search("name", args.searchQuery)
      )
      .take(args.limit ?? 10); // Default limit to 10 if not provided

    // Return only necessary fields (id, name, email)
    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
    }));
  },
});

/**
 * Follow another user
 */
export const followUser = mutation({
  args: {
    followerId: v.id("users"), // Current user
    followingId: v.id("users"), // User to follow
  },
  handler: async (ctx, args) => {
    // Check if already following
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId)
      )
      .first();

    if (!existing) {
      // Create new follow relationship
      const followId = await ctx.db.insert("follows", {
        followerId: args.followerId,
        followingId: args.followingId,
        createdAt: Date.now(),
      });

      // Create notification for the followed user
      await ctx.db.insert("notifications", {
        userId: args.followingId,
        type: "follow",
        relatedUserId: args.followerId,
        content: "Someone started following you",
        isRead: false,
        createdAt: Date.now(),
      });

      return followId;
    }

    return null;
  },
});

/**
 * Unfollow a user
 */
export const unfollowUser = mutation({
  args: {
    followerId: v.id("users"), // Current user
    followingId: v.id("users"), // User to unfollow
  },
  handler: async (ctx, args) => {
    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", args.followingId)
      )
      .first();

    if (follow) {
      await ctx.db.delete(follow._id);
      return true;
    }

    return false;
  },
});

/**
 * Get followers for a user
 */
export const getFollowers = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    // Get detailed user information for each follower
    const followerIds = follows.map((follow) => follow.followerId);
    const followers = await Promise.all(
      followerIds.map((id) => ctx.db.get(id))
    );

    return followers.filter(Boolean); // Filter out null values
  },
});

/**
 * Get users that a user is following
 */
export const getFollowing = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    // Get detailed user information for each followed user
    const followingIds = follows.map((follow) => follow.followingId);
    const following = await Promise.all(
      followingIds.map((id) => ctx.db.get(id))
    );

    return following.filter(Boolean); // Filter out null values
  },
});

/**
 * Get multiple users by their IDs
 */
export const getUsersById = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map((id) => ctx.db.get(id))
    );
    // Filter out null results (if an ID didn't match)
    return users.filter((user): user is Doc<"users"> => user !== null);
  },
});

/**
 * List all users up to a limit
 */
export const listUsers = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20; // Default to 20 users

    const users = await ctx.db
      .query("users")
      .withIndex("by_createdAt") // Use the createdAt index
      .order("desc") // Sort by createdAt in descending order
      .take(limit);

    // Return fields needed for the admin UI
    return users.map((user) => ({
      _id: user._id,
      name: user.name || "Unnamed User", // Provide default for missing names
      email: user.email || "", // Ensure email is never undefined
      createdAt: user.createdAt,
      isOnline: user.isOnline || false,
      lastSeen: user.lastSeen,
      image: user.image
    }));
  },
});

/**
 * Internal mutation to set a user's status to offline
 */
export const setUserOffline = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user && user.isOnline) {
      await ctx.db.patch(args.userId, { isOnline: false, lastSeen: Date.now() });
      console.log(`User ${args.userId} marked as offline.`);
    } else {
      console.log(`User ${args.userId} not found or already offline.`);
    }
  },
});

/**
 * DANGEROUS: Delete all users from the database
 * This is intended for development/testing purposes only
 */
export const deleteAllUsers = mutation({
  args: {
    confirmationPhrase: v.string(),
  },
  handler: async (ctx, args) => {
    // Safety check - require a specific confirmation phrase
    if (args.confirmationPhrase !== "ERASE_ALL_USERS_CONFIRM") {
      throw new Error("Incorrect confirmation phrase. Operation aborted for safety.");
    }

    // Get all user IDs
    const users = await ctx.db.query("users").collect();
    const userIds = users.map(user => user._id);
    
    console.log(`Preparing to delete ${userIds.length} users from the database`);
    
    // Delete all users
    let deletedCount = 0;
    for (const userId of userIds) {
      await ctx.db.delete(userId);
      deletedCount++;
      
      // Log progress in batches to avoid console spam
      if (deletedCount % 10 === 0 || deletedCount === userIds.length) {
        console.log(`Deleted ${deletedCount}/${userIds.length} users`);
      }
    }
    
    return {
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} users from the database.`
    };
  },
});
