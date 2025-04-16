"use client";

import { LiveRoomsSection } from "@/components/rooms/live-rooms-section";
import { UpcomingRoomsSection } from "@/components/rooms/upcoming-rooms-section";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";
import { DebugConvex } from "@/components/debug-convex";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VideoRoomCard } from "@/components/rooms/video-room-card";
import { CreateVideoRoomButton } from "@/components/rooms/create-video-room-button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const triggerDeleteAllRooms = useMutation(api.rooms.triggerDeleteAllRooms);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRooms = useQuery(api.rooms.listByType, { type: 'video', limit: 6 });

  const isLoadingVideoRooms = videoRooms === undefined;

  const handleDeleteAllRooms = async () => {
    setIsDeleting(true);
    try {
      const result = await triggerDeleteAllRooms({});
      toast({
        title: "Cleanup Started",
        description: result.message,
      });
    } catch (error) {
      console.error("Failed to trigger room cleanup:", error);
      toast({
        title: "Cleanup Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <Header />

      <main className="mt-8">
        <HeroSection />

        <section className="mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Video Rooms</h2>
            <CreateVideoRoomButton />
          </div>
          {isLoadingVideoRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[150px]">
                <div className="col-span-full flex justify-center items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
          ) : videoRooms && videoRooms.length === 0 ? (
            <p className="text-muted-foreground">
              No active video rooms right now. Start one!
            </p>
          ) : videoRooms && videoRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <LiveRoomsSection />

        <UpcomingRoomsSection />

        <div className="mt-12 p-4 bg-muted rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <DebugConvex />
        </div>

        <div className="mt-12 w-full max-w-4xl p-4 border border-dashed border-red-500 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Development Tools
          </h3>
          <p className="text-sm text-red-600 mb-4">
            Warning: These actions are destructive and intended for
            development/testing purposes only.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? "Cleaning Up..." : "Clean Up All Rooms"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete ALL
                  rooms and their associated data (participants, messages, etc.)
                  from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllRooms}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Confirm Deletion
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <Footer className="mt-16" />
    </div>
  );
}
