"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function UserProfileCard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-20 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Sign in to create and join rooms</p>
          <Button onClick={() => router.push("/sign-in")}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <h3 className="font-semibold">Your Profile</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
            <AvatarFallback>
              {user.fullName?.[0] || user.username?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.fullName || user.username}</p>
            <p className="text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push("/profile/rooms")}
          >
            My Rooms
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => router.push("/profile/recordings")}
          >
            Recordings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 