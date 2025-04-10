"use client";

import { RoomList } from "./room-list";

export function RecentRecordingsSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Recent Recordings</h2>
      <RoomList type="ended" limit={4} />
    </div>
  );
} 