import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "convex/_generated/dataModel";

interface RoomsProps {
  type: "live" | "scheduled" | "ended" | "recommended" | "user";
  userId?: Id<"users">;
  limit?: number;
}

export const useRooms = () => {
  const useLiveRooms = ({ type, limit = 10 }: RoomsProps) => {
    const liveRooms = useQuery(
      api.rooms.list,
      type === "live"
        ? { status: "live" as const, limit, isPrivate: false }
        : "skip"
    );
    return liveRooms;
  };

  const useScheduledRooms = ({ type, limit }: RoomsProps) => {
    const scheduledRooms = useQuery(
      api.rooms.listScheduled,
      type === "scheduled" ? { limit } : "skip"
    );
    return scheduledRooms;
  };

  const useUserRooms = ({ type, userId, limit }: RoomsProps) => {
    const userRooms = useQuery(
      api.rooms.listByUser,
      type === "user" && userId ? { userId, limit } : "skip"
    );
    return userRooms;
  };

  // Recommended rooms are just a subset of live and upcoming rooms for the MVP
  // In a real app, you'd have a more sophisticated recommendation algorithm

  const useRecommendedRooms = ({ type, limit }: RoomsProps) => {
    const recommendedRooms = useQuery(
      api.rooms.list,
      type === "recommended" ? { limit, isPrivate: false } : "skip"
    );
    return recommendedRooms;
  };
  return {
    useLiveRooms,
    useScheduledRooms,
    useUserRooms,
    useRecommendedRooms,
  };
};
