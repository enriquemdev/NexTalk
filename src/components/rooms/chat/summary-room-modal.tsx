"use client";

<<<<<<< HEAD
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Download, Copy, Check } from "lucide-react";
import { useState } from "react";
// import ReactMarkdown from "react-markdown";

interface SummaryModalProps {
  isGenerating?: boolean;
  summary?: string;
}

export function SummaryRoomModal({
  isGenerating,
  // summary,
}: SummaryModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    // navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    // const blob = new Blob([summary], { type: "text/markdown" });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "meeting-summary.md";
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    // URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Generate summary</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting Summary</DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500">Generating summary...</p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {/* <ReactMarkdown>{summary}</ReactMarkdown> */}
          </div>
        )}

        <DialogFooter>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={isGenerating}
            >
              {isCopied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {isCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
=======
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
>>>>>>> privaterooms
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
<<<<<<< HEAD
}
=======
} 
>>>>>>> privaterooms
