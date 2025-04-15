"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react"; // Icon for the button
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react"; // Corrected import: useConvex
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function JoinPrivateRoomButton() {
  const router = useRouter();
  const convex = useConvex(); // Use the correct hook
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // We don't call the query immediately, only on submit
  // So we'll use a helper function with ctx.runQuery or similar approach if needed, 
  // or more simply, trigger it manually in the submit handler.
  // For simplicity, we'll manage the query call within the submit handler.

  const handleFindAndJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = accessCodeInput.trim().toUpperCase(); // Standardize code casing
    if (!code) {
        setError("Please enter an access code.");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
       // Use convex client to call the query manually
       const foundRoom = await convex.query(api.rooms.findRoomByAccessCode, { accessCode: code });

       if (foundRoom) {
            setIsDialogOpen(false);
            setAccessCodeInput("");
            toast.success("Room found! Joining...");
            // Navigate based on room type
            const roomPath = foundRoom.type === 'video' ? `/video-rooms/${foundRoom.roomId}` : `/room/${foundRoom.roomId}`;
            router.push(roomPath);
        } else {
            setError("No active private room found with that code.");
        }
    } catch (err) { // Explicitly type err
      console.error("Error finding room by access code:", err);
      setError(`An error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(open) => { 
        setIsDialogOpen(open); 
        if(!open) { // Reset on close
            setAccessCodeInput(""); 
            setError(null);
            setIsLoading(false);
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Join Private Room
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Private Room</DialogTitle>
            <DialogDescription>
              Enter the access code provided by the host.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFindAndJoinRoom}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="join-access-code" className="text-right">
                  Code
                </Label>
                <Input
                  id="join-access-code"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  className="col-span-3"
                  required
                  disabled={isLoading}
                  placeholder="Enter 6-character code"
                  maxLength={6} // Assuming 6 char code
                />
              </div>
              {error && <p className="text-sm text-red-500 col-span-4 text-center">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Find & Join Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 