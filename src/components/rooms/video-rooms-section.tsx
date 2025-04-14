"use client";

import { useState, useEffect } from "react";
import { VideoRoomCard } from "./video-room-card";
import { CreateVideoRoomButton } from "./create-video-room-button";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";

// We'll use localStorage to track recent rooms the user has visited
const RECENT_ROOMS_KEY = "nextalk_recent_video_rooms";

interface VideoRoom {
  roomName: string;
  lastVisited: number;
  isActive: boolean;
}

function getRecentRooms(): VideoRoom[] {
  if (typeof window === "undefined") return [];
  
  try {
    const storedRooms = localStorage.getItem(RECENT_ROOMS_KEY);
    if (!storedRooms) return [];
    
    const rooms = JSON.parse(storedRooms) as VideoRoom[];
    
    // Sort by most recently visited
    return rooms.sort((a, b) => b.lastVisited - a.lastVisited);
  } catch (error) {
    console.error("Error loading recent rooms:", error);
    return [];
  }
}

export function VideoRoomsSection() {
  const [recentRooms, setRecentRooms] = useState<VideoRoom[]>([]);
  
  useEffect(() => {
    setRecentRooms(getRecentRooms());
  }, []);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-5 h-5" />
          Video Rooms
        </h2>
        <CreateVideoRoomButton />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentRooms.length > 0 ? (
          recentRooms.map((room) => (
            <VideoRoomCard
              key={room.roomName}
              roomName={room.roomName}
              isActive={room.isActive}
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-4 text-center text-muted-foreground">
              <p>No recent video rooms. Create one to get started!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 