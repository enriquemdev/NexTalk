import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
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
 * Search for users by name or email
 */
export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.query.toLowerCase();
    const limit = args.limit ?? 10;
    
    // Fetch all users - in a real app you'd want pagination
    // and more sophisticated searching
    const users = await ctx.db.query("users").collect();
    
    // Filter users whose name or email contains the query
    return users
      .filter(
        (user) =>
          (user.name?.toLowerCase().includes(query) ?? false) ||
          (user.email?.toLowerCase().includes(query) ?? false)
      )
      .slice(0, limit);
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
        q
          .eq("followerId", args.followerId)
          .eq("followingId", args.followingId)
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
        q
          .eq("followerId", args.followerId)
          .eq("followingId", args.followingId)
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
export const getMultiple = query({
  args: { 
    userIds: v.array(v.id("users")) 
  },
  returns: v.array(
    v.union(
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        bio: v.optional(v.string()),
        lastSeen: v.optional(v.number()),
        isOnline: v.optional(v.boolean()),
        createdAt: v.number(),
        tokenIdentifier: v.string(),
      }),
      v.null()
    )
  ),
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.userIds.map(async (userId) => {
        return await ctx.db.get(userId);
      })
    );
    
    return users;
  },
}); 