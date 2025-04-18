"use client";

import { LiveRoomsSection } from "@/components/rooms/live-rooms-section";
import { UpcomingRoomsSection } from "@/components/rooms/upcoming-rooms-section";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { VideoRoomCard } from "@/components/rooms/video-room-card";
import { CreateVideoRoomButton } from "@/components/rooms/create-video-room-button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const videoRooms = useQuery(api.rooms.listByType, { type: 'video', limit: 6 });
  const isLoadingVideoRooms = videoRooms === undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />

      <main className="mt-8">
        <HeroSection />

        <section className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Video Rooms</h2>
            <CreateVideoRoomButton />
          </div>
          {isLoadingVideoRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[150px]">
                <div className="col-span-full flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
          ) : videoRooms && videoRooms.length === 0 ? (
            <p className="text-muted-foreground">
              No active video rooms right now. Start one!
            </p>
          ) : videoRooms && videoRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoRooms.map((room) => (
                <VideoRoomCard
                  key={room._id}
                  roomId={room._id}
                  roomName={room.name}
                  isPrivate={room.isPrivate}
                  isActive={room.status === 'live' || room.status === 'scheduled'}
                />
              ))}
            </div>
          ) : null}
        </section>

        <div className="mt-16">
          <LiveRoomsSection />
        </div>

        <div className="mt-16">
          <UpcomingRoomsSection />
        </div>

        {/* REMOVED Debug Info Section */}
        
        {/* REMOVED Development Tools Section */}
       
      </main>

      <Footer className="mt-16" />
    </div>
  );
}
