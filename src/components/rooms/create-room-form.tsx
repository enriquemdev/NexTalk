"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface CreateRoomFormProps {
  onSuccess?: () => void;
}

export function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const { toast } = useToast();
  const createRoom = useMutation(api.rooms.create);
  const { userId } = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (!userId) {
        throw new Error("You must be logged in to create a room");
      }

      const formData = new FormData(event.currentTarget);
      await createRoom({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        isPrivate,
        isRecorded,
        userId,
      });

      toast({
        title: "Success",
        description: "Room created successfully!",
      });

      onSuccess?.();
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Room Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter room name"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Enter room description"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="private">Private Room</Label>
          <Switch
            id="private"
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="recorded">Record Session</Label>
          <Switch
            id="recorded"
            checked={isRecorded}
            onCheckedChange={setIsRecorded}
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Room"}
      </Button>
    </form>
  );
} 