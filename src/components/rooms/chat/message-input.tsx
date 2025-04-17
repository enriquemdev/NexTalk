"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal } from 'lucide-react';
import { Id } from '../../../../convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';
import { useCurrentUser } from "@/hooks/useCurrentUser"; // Assuming you have this hook

interface MessageInputProps {
  roomId: Id<"rooms">;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const sendMessage = useMutation(api.messages.send);
  const [isSending, setIsSending] = useState(false);
  const { userId } = useCurrentUser(); // Get current user ID

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content || !userId) return; // Don't send empty messages or if not logged in

    setIsSending(true);
    try {
      await sendMessage({ 
        roomId,
        userId, // Pass the user ID
        content,
      });
      setMessage(""); // Clear input on success
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline on simple Enter
      
      // Check if message is not empty before submitting
      const content = message.trim();
      if (content && userId) {
        // Create a synthetic event object if handleSubmit strictly needs it, 
        // or simply call the core logic if possible.
        // For simplicity, let's call the submit handler directly
        handleSubmit(e as unknown as React.FormEvent); // Cast to avoid direct type conflict if necessary, 
                                                      // but ensure handleSubmit doesn't rely on specific FormEvent props
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-background flex items-center gap-2">
      <Textarea
        placeholder="Type your message..." 
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="flex-1 resize-none min-h-[40px] max-h-[120px] overflow-y-auto rounded-full px-4 py-2 focus-visible:ring-1"
        disabled={isSending || !userId}
      />
      <Button 
        type="submit" 
        size="icon" 
        disabled={isSending || !message.trim() || !userId}
        className="rounded-full flex-shrink-0"
      >
        <SendHorizonal className="h-5 w-5" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
} 
