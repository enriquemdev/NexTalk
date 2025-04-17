import { Id } from "convex/_generated/dataModel";

export interface User {
  _id: Id<"users">;
  _creationTime: number;
  image?: string | undefined;
  name?: string | undefined;
  email?: string | undefined;
  bio?: string | undefined;
  lastSeen?: number | undefined;
  isOnline?: boolean | undefined;
  tokenIdentifier?: string;
  createdAt?: number;
}
