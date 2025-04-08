"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RoomCard } from "@/components/rooms/room-card";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { Toaster } from "sonner";

export default function Home() {
  const rooms = useQuery(api.rooms.list);

  return (
    <>
      <Toaster />
      <main className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Chat Rooms</h1>
          <CreateRoomForm />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms?.map((room) => (
            <RoomCard
              key={room._id}
              id={room._id}
              name={room.name}
              description={room.description}
              createdAt={room.createdAt}
            />
          ))}
          {!rooms?.length && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No rooms available. Create one to get started!
            </p>
          )}
        </div>
      </main>
    </>
  );
}
