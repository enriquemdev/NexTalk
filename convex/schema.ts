import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // user ID
    createdAt: v.number(), // timestamp
  }).index("by_createdAt", ["createdAt"]),

  messages: defineTable({
    roomId: v.id("rooms"),
    content: v.string(),
    author: v.string(), // user ID
    createdAt: v.number(), // timestamp
  })
    .index("by_roomId_createdAt", ["roomId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),
}); 