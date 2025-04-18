"use client";

import { RoomList } from "./room-list";

export function LiveRoomsSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Live Now</h2>
      <RoomList type="live" limit={6} />
    </div>
  );
} 