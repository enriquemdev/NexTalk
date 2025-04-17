import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every hour
crons.interval(
  "cleanup expired invitations",
  { hours: 1 },
  internal.invitations.cleanupExpiredInvitations,
  {}
);

export default crons; 