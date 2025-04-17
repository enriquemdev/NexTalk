"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InvitePageProps {
  params: {
    token: string;
  };
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const convex = useConvex();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  useEffect(() => {
    async function validateInvitation() {
      try {
        const result = await convex.query(api.invitations.validateInvitation, {
          token: params.token,
        });

        if (!result.valid) {
          setError(result.reason || "Invalid invitation");
          return;
        }

        // Get room details
        const room = await convex.query(api.rooms.get, {
          roomId: result.roomId!,
        });

        if (!room) {
          setError("Room not found");
          return;
        }

        setRoomName(room.name);
      } catch (error) {
        console.error("Failed to validate invitation:", error);
        setError("Failed to validate invitation");
      } finally {
        setIsLoading(false);
      }
    }

    validateInvitation();
  }, [convex, params.token]);

  const handleJoinRoom = async () => {
    try {
      setIsLoading(true);
      const roomId = await convex.mutation(api.invitations.useInvitation, {
        token: params.token,
      });
      
      toast.success("Invitation accepted!");
      router.push(`/rooms/${roomId}`);
    } catch (error) {
      console.error("Failed to join room:", error);
      setError("Failed to join room");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => router.push("/")}>
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle>Room Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join {roomName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click the button below to accept the invitation and join the room.
          </p>
        </CardContent>
        <CardFooter className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/")} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleJoinRoom} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Room"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 