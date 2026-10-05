"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Users, Lock, Mail } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { InviteUsers } from "./invite-users";

interface VideoRoomCardProps {
  roomId: Id<"rooms">;
  roomName: string;
  isPrivate: boolean;
  roomType: "audio" | "video";
  status: string;
}

export function VideoRoomCard({ roomId, roomName, isPrivate, roomType, status }: VideoRoomCardProps) {
  const router = useRouter();
  const roomPath = roomType === "video" ? `/video-rooms/${roomId}` : `/rooms/${roomId}`;
  const isLive = status === "live";
  const canEnter = isLive || (status === "ended" && roomType === "audio");
  const statusLabel = isLive ? "Live" : status === "scheduled" ? "Scheduled" : status === "ended" ? "Ended" : "Unavailable";
  const checkCodeMutation = useMutation(api.rooms.checkAccessCode);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinClick = () => {
    if (!canEnter) return;
    if (isPrivate) {
      setError(null);
      setAccessCodeInput("");
      setIsDialogOpen(true);
    } else {
      router.push(roomPath);
    }
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !canEnter) return;
    if (!accessCodeInput.trim()) {
      setError("Please enter the access code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isValid = await checkCodeMutation({
        roomId: roomId,
        accessCode: accessCodeInput.trim(),
      });

      if (isValid) {
        setIsDialogOpen(false);
        toast.success("Access code accepted!");
        router.push(roomPath);
      } else {
        setError("Invalid access code. Please try again.");
      }
    } catch (err) {
      console.error("Failed to validate access code:", err);
      setError("An error occurred validating the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="pt-6 pb-4">
          <div className="flex justify-between items-start">
            {isPrivate && (
              <span title="Private Room">
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </span>
            )}
            <CardTitle className="text-lg line-clamp-1 flex items-center gap-2">
              <span className="truncate">{roomName}</span>
            </CardTitle>
            <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}>
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="w-4 h-4 mr-2" />
            <span>{isPrivate ? "Private" : "Public"} {roomType === "video" ? "video room" : "chat room"}</span>
          </div>
        </CardContent>
        
        <CardFooter className="flex gap-4 w-full">
          <Button 
            variant="default"
            className="w-1/2 cursor-pointer"
            onClick={handleJoinClick}
            disabled={!canEnter}
          >
            {status === "ended" ? (roomType === "audio" ? "View chat" : "Ended") : status === "scheduled" ? "Not started" : "Join"}
          </Button>
          {isLive && <InviteUsers
            roomId={roomId}
            trigger={
              <Button 
                variant="outline" 
                className="w-1/2 cursor-pointer"
              >
                <Mail className="w-4 h-4 mr-1" />
                Invite
              </Button>
            }
          />}
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Access Code</DialogTitle>
            <DialogDescription>
              This is a private room. Please enter the access code to join.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAccessCodeSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="access-code" className="text-right">
                  Code
                </Label>
                <Input
                  id="access-code"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  className="col-span-3"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isLoading}
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Validating..." : "Join Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Error Alert Dialog (Alternative if inline error isn't preferred) */}
      {/* <AlertDialog open={!!error} onOpenChange={() => setError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Access Denied</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setError(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </>
  );
}
