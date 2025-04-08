"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Doc, Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { 
  CalendarIcon, 
  MicIcon, 
  UsersIcon, 
  LockIcon, 
  CircleIcon
} from "lucide-react";

interface RoomCardProps {
  room: Doc<"rooms">;
}

interface User {
  name?: string;
  _id: Id<"users">;
}

// Simple User Avatar component
function UserAvatar({ user, className }: { user: User | null, className?: string }) {
  return (
    <Avatar className={className}>
      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
        <span className="font-semibold text-xs">{user?.name?.[0] || '?'}</span>
      </div>
    </Avatar>
  );
}

export function RoomCard({ room }: RoomCardProps) {
  const router = useRouter();
  
  // Get creator info
  const creator = useQuery(api.users.get, { userId: room.createdBy });
  
  // Get current participant count
  const participantCount = room.participantCount || 0;

  // Calculate time displayed for the room
  const getTimeDisplay = () => {
    if (room.status === "live") {
      return room.startedAt 
        ? `Started ${formatDistanceToNow(room.startedAt, { addSuffix: true })}` 
        : "Live now";
    } else if (room.status === "scheduled") {
      return room.scheduledFor 
        ? `Scheduled ${formatDistanceToNow(room.scheduledFor, { addSuffix: true })}` 
        : "Scheduled";
    } else {
      return room.endedAt 
        ? `Ended ${formatDistanceToNow(room.endedAt, { addSuffix: true })}` 
        : "Ended";
    }
  };

  // Get status badge color
  const getStatusBadge = () => {
    switch (room.status) {
      case "live":
        return <Badge className="bg-green-500 hover:bg-green-600">Live</Badge>;
      case "scheduled":
        return <Badge variant="outline">Upcoming</Badge>;
      case "ended":
        return <Badge variant="secondary">Ended</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1">{room.name}</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription className="line-clamp-1">
          {room.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-col space-y-2">
          {/* Host Info */}
          <div className="flex items-center text-sm text-muted-foreground">
            <UserAvatar 
              user={creator} 
              className="h-5 w-5 mr-2"
            />
            <span>Hosted by {creator?.name || "Unknown"}</span>
          </div>
          
          {/* Room Details */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center">
              <CalendarIcon className="w-3 h-3 mr-1" />
              <span>{getTimeDisplay()}</span>
            </div>
            
            <div className="flex items-center">
              <UsersIcon className="w-3 h-3 mr-1" /> 
              <span>{participantCount} {participantCount === 1 ? "participant" : "participants"}</span>
            </div>
            
            {room.isPrivate && (
              <div className="flex items-center">
                <LockIcon className="w-3 h-3 mr-1" /> 
                <span>Private</span>
              </div>
            )}
            
            {room.isRecorded && (
              <div className="flex items-center">
                <CircleIcon className="w-3 h-3 mr-1 fill-red-500 text-red-500" /> 
                <span>Recorded</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button 
          variant={room.status === "live" ? "default" : "outline"}
          className="w-full"
          onClick={() => router.push(`/rooms/${room._id}`)}
        >
          {room.status === "live" 
            ? <><MicIcon className="w-4 h-4 mr-2" /> Join Room</>
            : room.status === "scheduled"
              ? "View Details"
              : "View Recording"
          }
        </Button>
      </CardFooter>
    </Card>
  );
} 