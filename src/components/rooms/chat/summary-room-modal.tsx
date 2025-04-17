"use client";

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
import { Loader2, Download, Copy, Check, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { useSummary } from "@/hooks/useSummary";
import { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";

interface SummaryModalProps {
  roomId: Id<"rooms">;
}

export function SummaryRoomModal({ roomId }: SummaryModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { 
    summary: storedSummary,
    isGenerating, 
    generateSummary, 
    streamingCompletion,
    hasContent,
    error 
  } = useSummary(roomId);

  const displayContent = isGenerating ? streamingCompletion : storedSummary;
  const displayLength = displayContent?.length || 0;

  useEffect(() => {
    if (error) {
      toast.error(`Summary error: ${error.message}`);
    }
  }, [error]);

  const handleGenerateSummaryClick = async () => {
    if (!hasContent) {
       toast.error("No content available to generate a summary.");
       return;
    }
    await generateSummary(); 
  };

  const handleCopy = () => {
    if (displayContent) {
      navigator.clipboard.writeText(displayContent)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error("Failed to copy text: ", err);
          toast.error("Failed to copy summary to clipboard.");
        });
    }
  };

  const handleDownload = () => {
    if (displayContent) {
      const blob = new Blob([displayContent], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NexTalk-Summary-${roomId}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !storedSummary && !isGenerating && hasContent) {
       handleGenerateSummaryClick();
    } else if (open && !hasContent) {
       // Optionally show a message inside the dialog instead of a toast immediately
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Room Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comprehensive Room Summary</DialogTitle>
           {displayLength > 0 && (
             <p className="text-xs text-muted-foreground mt-1">
               {displayLength} characters {isGenerating ? "(generating...)" : ""}
             </p>
           )}
        </DialogHeader>

        <div className="flex-grow overflow-y-auto my-4 pr-6 -mr-6">
           {isGenerating && !streamingCompletion ? (
             <div className="flex flex-col items-center justify-center h-full"> 
               <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
               <p className="text-gray-500">Initializing summary generation...</p>
             </div>
           ) : isGenerating && streamingCompletion ? (
             <div className="prose prose-sm max-w-md dark:prose-invert">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingCompletion}</ReactMarkdown>
             </div>
           ) : storedSummary ? (
             <div className="prose prose-sm max-w-md dark:prose-invert mx-auto container">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>{storedSummary}</ReactMarkdown>
             </div>
           ) : !hasContent ? (
              <div className="flex flex-col items-center justify-center h-full">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 text-center px-4">No messages or transcriptions available in this room to generate a summary.</p>
              </div>
           ) : (
              <div className="flex flex-col items-center justify-center h-full">
                 <FileText className="h-12 w-12 text-gray-400 mb-4" />
                 <p className="text-gray-500">Summary not yet generated.</p>
                 <Button onClick={handleGenerateSummaryClick} className="mt-4">Generate Summary</Button>
              </div>
           )}
        </div>

        <DialogFooter className="mt-auto flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-0 justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {hasContent && !isGenerating && (
              <Button onClick={handleGenerateSummaryClick}>
                {storedSummary ? "Re-generate Summary" : "Generate Summary"}
              </Button>
            )}
            {isGenerating && (
              <Button variant="outline" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!displayContent}
              size="sm"
            >
              {isCopied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {isCopied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!displayContent}
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
