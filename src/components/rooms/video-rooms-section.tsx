"use client";

// import { useState, useEffect } from "react";
import { VideoRoomCard } from "./video-room-card";
import { CreateVideoRoomButton } from "./create-video-room-button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function VideoRoomsSection() {
  const videoRooms = useQuery(api.rooms.listByType, { type: 'video', limit: 10 });

  const isLoading = videoRooms === undefined;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-5 h-5" />
          Video Rooms
        </h2>
        <CreateVideoRoomButton />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[150px]">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : videoRooms && videoRooms.length > 0 ? (
          videoRooms.map((room) => (
            <VideoRoomCard
              key={room._id}
              roomId={room._id}
              roomName={room.name}
              isPrivate={room.isPrivate}
              isActive={room.status === 'live'}
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-6 text-center text-muted-foreground">
              <p>No video rooms found. Create one to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 