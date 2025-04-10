"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MicIcon, UsersIcon } from "lucide-react";

export function FeaturedRoomsBanner() {
  const router = useRouter();
  const featuredRooms = useQuery(api.rooms.list, { status: "live", limit: 1 });

  if (!featuredRooms || featuredRooms.length === 0) {
    return null;
  }

  const room = featuredRooms[0];
  const participantCount = room.participantCount || 0;

  return (
    <Card className="mb-8 overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600">
      <CardContent className="p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4">
            <Badge className="bg-white/20 hover:bg-white/30 text-white">Featured Room</Badge>
            <h3 className="text-3xl font-bold">{room.name}</h3>
            <p className="text-white/80 max-w-lg">{room.description}</p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-4 h-4" />
                <span>{participantCount} listening</span>
              </div>
            </div>
          </div>

          <Button 
            size="lg"
            onClick={() => router.push(`/rooms/${room._id}`)}
            className="bg-white text-indigo-600 hover:bg-white/90"
          >
            <MicIcon className="w-4 h-4 mr-2" />
            Join Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 