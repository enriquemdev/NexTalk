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
