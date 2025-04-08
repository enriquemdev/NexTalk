"use client";

import { RoomList } from "./room-list";

export function UpcomingRoomsSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Coming Up</h2>
      <RoomList type="scheduled" limit={4} />
    </div>
  );
} 