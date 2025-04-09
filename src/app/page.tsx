"use client";

import { CreateRoomButton } from "@/components/rooms/create-room-button";
import { LiveRoomsSection } from "@/components/rooms/live-rooms-section";
import { UpcomingRoomsSection } from "@/components/rooms/upcoming-rooms-section";
import { RecentRecordingsSection } from "@/components/rooms/recent-recordings-section";
import { UserProfileCard } from "@/components/user/user-profile-card";
import { FeaturedRoomsBanner } from "@/components/rooms/featured-rooms-banner";
import { DebugConvex } from "@/components/debug-convex";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-8">
        <div className="space-y-8">
          <FeaturedRoomsBanner />
          <LiveRoomsSection />
          <UpcomingRoomsSection />
          <RecentRecordingsSection />
          <DebugConvex />
        </div>
        <div className="space-y-4">
          <UserProfileCard />
          <CreateRoomButton />
        </div>
      </div>
    </div>
  );
}
