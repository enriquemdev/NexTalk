"use client";

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
    }
  };

  return (
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
