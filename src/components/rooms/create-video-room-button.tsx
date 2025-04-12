"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { randomString } from "@/lib/client-utils";
import { VideoIcon } from "lucide-react";

export function CreateVideoRoomButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async () => {
    // Validate room name
    let finalRoomName = roomName.trim() || randomString(8);
    
    // Ensure the room name is valid
    if (finalRoomName === 'undefined' || finalRoomName === '') {
      finalRoomName = randomString(8);
    }
    
    // Remove any special characters that might cause issues
    finalRoomName = finalRoomName
      .replace(/[^\w\s-]/g, '') // Replace non-word, non-space, non-hyphen chars
      .replace(/\s+/g, '-')    // Replace spaces with hyphens
      .toLowerCase();          // Convert to lowercase
    
    // If after cleanup it's empty, generate a random string
    if (!finalRoomName) {
      finalRoomName = randomString(8);
    }
    
    console.log("Creating room with name:", finalRoomName);
    
    setIsCreating(true);
    
    try {
      // Navigate to the video room with properly encoded URL
      router.push(`/video-rooms/${encodeURIComponent(finalRoomName)}`);
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating video room:", error);
      alert("Error creating video room. Please try again with a different name.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2">
          <VideoIcon className="w-4 h-4" />
          New Video Room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Video Room</DialogTitle>
          <DialogDescription>
            Start a new video conference. You can invite others by sharing the room link.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                id="roomName"
                placeholder="Room name (optional)"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                If you don&apos;t provide a name, a random one will be generated
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 