<<<<<<< HEAD
import { Button } from "@/components/ui/button";
import { Clock, Video, Mic, Users, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SummaryRoomModal } from "./summary-room-modal";

interface MeetingHeaderProps {
  title: string;
  startTime: string;
  endTime: string;
  status: string;
}

export const RoomHeader = ({
  title,
  startTime,
  endTime,
  status,
}: MeetingHeaderProps) => {
  return (
    <header className="border-b border-gray-200 bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <div className="flex items-center text-sm text-secondary-foreground mt-1">
            <Clock className="h-4 w-4 mr-1" />
            <span className="mr-4">
              {startTime} - {endTime}
            </span>
            <Badge
              className={status === "live" ? "bg-green-500" : "bg-gray-500"}
            >
              {status === "live"
                ? "Live"
                : status === "scheduled"
                  ? "Scheduled"
                  : "Ended"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <SummaryRoomModal />

          <Button variant="outline" size="icon">
            <Mic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Meeting settings</DropdownMenuItem>
              <DropdownMenuItem>Share meeting</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                End meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
=======
"use client";

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Share2, LogOut, Lock } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel'; // Adjusted path

interface RoomHeaderProps {
  roomId: Id<"rooms">;
  roomName: string;
  status: 'scheduled' | 'live' | 'ended';
  participantCount?: number;
  isPrivate?: boolean;
  onLeave?: () => void;
  onShare?: (roomId: Id<"rooms">) => void;
}

export function RoomHeader({ 
  roomId,
  roomName, 
  status, 
  participantCount = 0, 
  isPrivate = false,
  onLeave,
  onShare 
}: RoomHeaderProps) {

  const getStatusBadgeVariant = (): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
    switch (status) {
      case 'live': return 'default'; // Consider a specific "live" variant if defined
      case 'scheduled': return 'secondary';
      case 'ended': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = () => {
      switch (status) {
          case 'live': return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
          case 'scheduled': return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
          case 'ended': return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
          default: return "";
      }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b bg-card">
      <div className="flex items-center gap-3 min-w-0">
        {isPrivate && 
          <span title="Private Room">
            <Lock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </span>
        }
        <h1 className="text-xl font-semibold truncate" title={roomName}>
          {roomName}
        </h1>
        <Badge variant={getStatusBadgeVariant()} className={`capitalize ${getStatusColor()}`}>
          {status}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm text-muted-foreground" title={`${participantCount} participants`}>
          <Users className="w-4 h-4" />
          <span>{participantCount}</span>
        </div>
        {onShare && (
          <Button variant="ghost" size="icon" onClick={() => onShare(roomId)} title="Share Room">
            <Share2 className="w-4 h-4" />
            <span className="sr-only">Share</span>
          </Button>
        )}
        {onLeave && (
          <Button variant="outline" size="sm" onClick={onLeave} title="Leave Room">
             <LogOut className="w-4 h-4 mr-2" />
             Leave
          </Button>
        )}
      </div>
    </div>
  );
} 
>>>>>>> privaterooms
