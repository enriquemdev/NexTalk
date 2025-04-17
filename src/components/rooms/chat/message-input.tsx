"use client";

<<<<<<< HEAD
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Smile } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

export function MessageInput({ roomId }: { roomId: Id<"rooms"> }) {
  const [message, setMessage] = useState("");
  const { userId } = useCurrentUser();

  // const { useSendMessage: sendMessage } = useMessage();

  const sendMessage = useMutation(api.messages.send);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("You must be logged in to create a room");
      return;
    }
    await sendMessage({
      roomId,
      userId,
      content: message,
    });
    if (message.trim()) {
      // onSendMessage(message);
      setMessage("");
=======
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
>>>>>>> privaterooms
    }
  };

  return (
<<<<<<< HEAD
    <form
      onSubmit={handleSubmit}
      className="flex items-center space-x-2 bg-background"
    >
      <div className="flex-1 relative bg-background">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="min-h-[60px] resize-none pr-12"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="absolute bottom-3 right-4 flex space-x-1 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Paperclip className="h-4 w-4 text-gray-500" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Smile className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </div>
      <Button
        type="submit"
        size="icon"
        className="h-10 w-10 bg-blue-600 hover:bg-blue-700"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
=======
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
>>>>>>> privaterooms
