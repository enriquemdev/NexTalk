"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation";
import { randomString } from "@/lib/client-utils";
import { VideoIcon, Copy } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

export function CreateVideoRoomButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const router = useRouter();
  const createRoom = useMutation(api.rooms.create);
  const { userId } = useCurrentUser();

  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode)
        .then(() => {
          toast.success("Access code copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy code:", err);
          toast.error("Failed to copy code.");
        });
    }
  };

  const handleCreateRoom = async () => {
    if (!userId) {
      toast.error("You must be logged in to create a room");
      setIsOpen(false);
      return;
    }

    setIsCreating(true);
    setCreatedRoomId(null);
    setAccessCode(null);

    let finalRoomName = roomName.trim() || randomString(8);
    if (finalRoomName === 'undefined' || finalRoomName === '') {
      finalRoomName = randomString(8);
    }
    finalRoomName = finalRoomName
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    if (!finalRoomName) {
      finalRoomName = randomString(8);
    }

    console.log(`Attempting to create ${isPrivate ? 'private' : 'public'} video room:`, finalRoomName);

    try {
      const result = await createRoom({
        name: finalRoomName,
        userId: userId,
        isPrivate: isPrivate,
      });

      toast.success("Room created successfully!");
      setIsOpen(false);
      setRoomName("");
      setIsPrivate(false);
      setCreatedRoomId(result.roomId);

      if (result.accessCode) {
        setAccessCode(result.accessCode);
        setShowAccessCodeDialog(true);
      } else {
        router.push(`/video-rooms/${result.roomId}`);
      }

    } catch (error: unknown) {
      console.error("Failed to create room via Convex:", error);
      toast.error("Failed to create room. Please try again.");
      setCreatedRoomId(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccessCodeDialogClose = () => {
    setShowAccessCodeDialog(false);
    if (createdRoomId) {
      router.push(`/video-rooms/${createdRoomId}`);
      setAccessCode(null);
      setCreatedRoomId(null);
    } else {
      console.error("Room ID not available for redirection after closing access code dialog.");
      router.push('/');
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setRoomName("");
          setIsPrivate(false);
          setCreatedRoomId(null);
          setAccessCode(null);
        }
      }}>
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
                <Label htmlFor="roomName">Room Name (Optional)</Label>
                <Input
                  id="roomName"
                  placeholder="Leave blank for random name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is-private-video"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="is-private-video">Private Room (requires access code)</Label>
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

      <AlertDialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Private Room Created!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Share this access code with users you want to invite to your private room.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center space-x-2 bg-muted p-3 rounded-md">
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold flex-grow">
                      {accessCode}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy Access Code</span>
                  </Button>
              </div>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={handleAccessCodeDialogClose}>Got it! Go to Room</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 