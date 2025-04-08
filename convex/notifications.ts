import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a notification
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    content: v.string(),
    relatedUserId: v.optional(v.id("users")),
    relatedRoomId: v.optional(v.id("rooms")),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      content: args.content,
      relatedUserId: args.relatedUserId,
      relatedRoomId: args.relatedRoomId,
      isRead: false,
      createdAt: Date.now(),
    });
    
    return notificationId;
  },
});

/**
 * Get all notifications for a user
 */
export const getForUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", args.userId))
      .order("desc");
    
    // Filter by read/unread status if requested
    if (args.includeRead === false) {
      query = query.filter((q) => q.eq(q.field("isRead"), false));
    }
    
    const notifications = await query.take(limit);
    
    // If there are related user IDs, fetch those users' details
    const userIds = notifications
      .map((n) => n.relatedUserId)
      .filter(Boolean) as Id<"users">[];
    
    // Get all users in one query
    const users = userIds.length > 0 
      ? await Promise.all(userIds.map((id) => ctx.db.get(id)))
      : [];
    
    const userMap = Object.fromEntries(
      users
        .filter(Boolean)
        .map((user) => [user?._id.toString(), user])
    );
    
    // If there are related room IDs, fetch those rooms' details
    const roomIds = notifications
      .map((n) => n.relatedRoomId)
      .filter(Boolean) as Id<"rooms">[];
    
    // Get all rooms in one query
    const rooms = roomIds.length > 0
      ? await Promise.all(roomIds.map((id) => ctx.db.get(id)))
      : [];
    
    const roomMap = Object.fromEntries(
      rooms
        .filter(Boolean)
        .map((room) => [room?._id.toString(), room])
    );
    
    // Combine notification data with related entities
    return notifications.map((notification) => {
      type NotificationResult = {
        notification: typeof notification;
        relatedUser?: { _id: Id<"users">; name?: string; image?: string } | null;
        relatedRoom?: { _id: Id<"rooms">; name: string; status: string } | null;
      };
      
      const result: NotificationResult = { notification };
      
      if (notification.relatedUserId) {
        const user = userMap[notification.relatedUserId.toString()];
        result.relatedUser = user 
          ? { 
              _id: user._id,
              name: user.name,
              image: user.image,
            }
          : null;
      }
      
      if (notification.relatedRoomId) {
        const room = roomMap[notification.relatedRoomId.toString()];
        result.relatedRoom = room
          ? {
              _id: room._id,
              name: room.name,
              status: room.status,
            }
          : null;
      }
      
      return result;
    });
  },
});

/**
 * Mark notifications as read
 */
export const markAsRead = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    for (const id of args.notificationIds) {
      await ctx.db.patch(id, {
        isRead: true,
      });
    }
    
    return args.notificationIds.length;
  },
});

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
      });
    }
    
    return unreadNotifications.length;
  },
});

/**
 * Count unread notifications for a user
 */
export const countUnread = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    
    return unreadNotifications.length;
  },
});

/**
 * Delete old notifications to keep the database clean
 * This would typically be called by a scheduled job
 */
export const cleanupOldNotifications = mutation({
  args: {
    userId: v.id("users"),
    olderThan: v.number(), // timestamp
    readOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", args.userId))
      .filter((q) => q.lt(q.field("createdAt"), args.olderThan));
    
    if (args.readOnly === true) {
      query = query.filter((q) => q.eq(q.field("isRead"), true));
    }
    
    const oldNotifications = await query.collect();
    
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }
    
    return oldNotifications.length;
  },
}); 