"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Id } from '../../../../convex/_generated/dataModel';
import { Skeleton } from "@/components/ui/skeleton";
import { BookText } from 'lucide-react';

interface SummaryRoomModalProps {
  roomId: Id<"rooms">;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SummaryRoomModal({ 
  // roomId,
  isOpen, 
  onOpenChange 
}: SummaryRoomModalProps) {
  // Placeholder for fetching summary data
  // TODO: Implement a Convex query/action (e.g., api.rooms.getSummary) 
  // Needs roomId
  const summaryData = undefined; 
  const isLoading = summaryData === undefined;
  const summaryText = "Room summary functionality is not yet implemented.";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookText className="w-5 h-5" />
            Room Summary
          </DialogTitle>
          <DialogDescription>
            An AI-generated summary of the key points discussed in this room.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[70%]" />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{summaryData ?? summaryText}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
