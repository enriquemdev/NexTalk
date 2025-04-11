'use client';

import { CreateRoomButton } from "@/components/rooms/create-room-button";
import { LiveRoomsSection } from "@/components/rooms/live-rooms-section";
import { UpcomingRoomsSection } from "@/components/rooms/upcoming-rooms-section";
import { RecentRecordingsSection } from "@/components/rooms/recent-recordings-section";
import { VideoRoomsSection } from "@/components/rooms/video-rooms-section";
import { UserProfileCard } from "@/components/user/user-profile-card";
import { FeaturedRoomsBanner } from "@/components/rooms/featured-rooms-banner";
import { DebugConvex } from "@/components/debug-convex";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
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

export default function Home() {
  const triggerDeleteAllRooms = useMutation(api.rooms.triggerDeleteAllRooms);
  const [isDeleting, setIsDeleting] = useState(false);

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
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,300px] gap-8">
        <div className="space-y-8">
          <FeaturedRoomsBanner />
          <VideoRoomsSection />
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

      {/* Development/Admin Cleanup Section */}
      <div className="mt-12 w-full max-w-4xl p-4 border border-dashed border-red-500 rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Development Tools</h3>
        <p className="text-sm text-red-600 mb-4">Warning: These actions are destructive and intended for development/testing purposes only.</p>
        
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
                This action cannot be undone. This will permanently delete ALL rooms and their associated data (participants, messages, etc.) from the database.
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
    </div>
  );
}
