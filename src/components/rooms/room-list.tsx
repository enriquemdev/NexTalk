"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { VideoRoomCard } from "./video-room-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pt-6 pb-4">
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
            </CardContent>
            <CardFooter className="flex gap-4 w-full">
              <Skeleton className="h-9 w-1/2" />
              <Skeleton className="h-9 w-1/2" />
            </CardFooter>
          </Card>
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

  // Render the rooms using the same grid layout as the homepage video section
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <VideoRoomCard
          key={room._id.toString()}
          roomId={room._id}
          roomName={room.name}
          isPrivate={room.isPrivate}
          isActive={room.status === 'live'}
        />
      ))}
    </div>
  );
} 