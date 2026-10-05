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

        <section id="video-rooms" className="mt-12 scroll-mt-6" aria-labelledby="video-rooms-heading">
          <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
            <h2 id="video-rooms-heading" className="text-2xl font-semibold">Video Rooms</h2>
            <CreateVideoRoomButton />
          </div>
          {isLoadingVideoRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[150px]">
                <div role="status" className="col-span-full flex gap-2 justify-center items-center">
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Loading video rooms...</span>
                </div>
            </div>
          ) : videoRooms && videoRooms.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/30">
              <p className="font-medium mb-2">No video rooms yet</p>
              <p className="text-sm text-muted-foreground">Create a new video room to start a conversation. Private rooms require the host&apos;s access code.</p>
            </div>
          ) : videoRooms && videoRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoRooms.map((room) => (
                <VideoRoomCard
                  key={room._id}
                  roomId={room._id}
                  roomName={room.name}
                  isPrivate={room.isPrivate}
                  roomType={room.type}
                  status={room.status}
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
