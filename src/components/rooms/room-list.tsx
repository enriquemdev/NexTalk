"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { RoomCard } from "./room-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "convex/_generated/dataModel";

interface RoomListProps {
  type: "live" | "scheduled" | "ended" | "recommended" | "user";
  userId?: Id<"users">;
  limit?: number;
}

export function RoomList({ type, userId, limit = 10 }: RoomListProps) {
  // Query different room types based on the type prop
  const liveRooms = useQuery(
    api.rooms.list, 
    type === "live" ? { status: "live" as const, limit, isPrivate: false } : "skip"
  );
  
  const scheduledRooms = useQuery(
    api.rooms.listScheduled, 
    type === "scheduled" ? { limit } : "skip"
  );
  
  const userRooms = useQuery(
    api.rooms.listByUser, 
    type === "user" && userId ? { userId, limit } : "skip"
  );
  
  // Recommended rooms are just a subset of live and upcoming rooms for the MVP
  // In a real app, you'd have a more sophisticated recommendation algorithm
  const recommendedRooms = useQuery(
    api.rooms.list, 
    type === "recommended" ? { limit, isPrivate: false } : "skip"
  );

  // Determine which rooms to display based on type
  const rooms = 
    type === "live" ? liveRooms :
    type === "scheduled" ? scheduledRooms :
    type === "user" ? userRooms :
    type === "recommended" ? recommendedRooms :
    [];

  // Loading state
  if (rooms === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">
          {type === "live" ? "No live rooms available right now." : 
           type === "scheduled" ? "No upcoming rooms scheduled." : 
           type === "user" ? "You haven't created any rooms yet." :
           "No recommended rooms available."}
        </p>
      </div>
    );
  }

  // Render the rooms
  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <RoomCard 
          key={room._id.toString()} 
          room={room} 
        />
      ))}
    </div>
  );
} 