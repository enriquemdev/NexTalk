"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Video, Users, ExternalLink } from "lucide-react";

interface VideoRoomCardProps {
  roomName: string;
  isActive?: boolean;
}

export function VideoRoomCard({ roomName, isActive = true }: VideoRoomCardProps) {
  const router = useRouter();

  const handleJoinRoom = () => {
    router.push(`/video-rooms/${roomName}`);
  };

  const handleShareRoom = () => {
    const roomUrl = `${window.location.origin}/video-rooms/${roomName}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Join my video room: ${roomName}`,
        text: `Join my video conference on NextTalk`,
        url: roomUrl,
      }).catch(error => console.error("Error sharing:", error));
    } else {
      navigator.clipboard.writeText(roomUrl).then(() => {
        alert("Room link copied to clipboard!");
      }).catch(error => {
        console.error("Failed to copy link:", error);
        prompt("Copy this link to share:", roomUrl);
      });
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-1 flex items-center gap-2">
            <Video className="w-4 h-4" />
            {roomName}
          </CardTitle>
          <Badge className={isActive ? "bg-green-500 hover:bg-green-600" : "bg-gray-500"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          <span>Video Conference Room</span>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="default"
          className="w-full"
          onClick={handleJoinRoom}
        >
          Join Room
        </Button>
        <Button 
          variant="ghost" 
          className="p-2" 
          onClick={handleShareRoom}
          title="Share room link"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
} 