import { Id } from "../../convex/_generated/dataModel";

export interface Message {
  message: {
    _id: Id<"messages">;
    roomId: Id<"rooms">;
    userId: Id<"users">;
    content: string;
    type: string;
    createdAt: number;
    isDeleted?: boolean;
  };
  user: {
    _id: Id<"users">;
    name?: string;
    image?: string;
  } | null;
} 