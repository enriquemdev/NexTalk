"use client";

import { RoomList } from "./room-list";

export function UpcomingRoomsSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Coming Up</h2>
      <RoomList type="scheduled" limit={4} />
    </div>
  );
} 