"use client";

import React, { useRef, useEffect } from 'react';
import { Id } from "../../../../convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { FunctionReturnType } from "convex/server"; // Import FunctionReturnType

// Remove the manual type definition
// export type MessageWithUser = Doc<"messages"> & { ... };

// Infer the message type from the query's return type
type MessagesType = FunctionReturnType<typeof api.messages.listMessagesWithUsers>;
// Get the type of a single message from the array type
type SingleMessageType = NonNullable<MessagesType>[number];

interface MessageListProps {
  roomId: Id<"rooms">;
}

interface MessageItemProps {
  message: SingleMessageType; // Use the inferred single message type
  isCurrentUser: boolean;
}

// Simple MessageItem subcomponent
function MessageItem({ message, isCurrentUser }: MessageItemProps) {
  // Access user properties safely
  const userName = message.user?.name ?? "User"; 
  const userImage = message.user?.image;
  const fallback = userName.charAt(0).toUpperCase();

  return (
    <div className={`flex items-start gap-3 p-3 ${isCurrentUser ? 'justify-end' : ''}`}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={userImage ?? undefined} alt={userName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      )}
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
         <div className={`rounded-lg p-2 px-3 ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {!isCurrentUser && <p className="text-xs font-medium mb-1">{userName}</p>} 
            <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
         </div>
        <span className="text-xs text-muted-foreground mt-1" title={new Date(message._creationTime).toLocaleString()}>
          {formatDistanceToNow(new Date(message._creationTime), { addSuffix: true })}
        </span>
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={userImage ?? undefined} alt={userName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export function MessageList({ roomId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TODO: Replace with actual current user ID fetching logic
  const currentUserId = "temp-user-id"; 

  const messages = useQuery(api.messages.listMessagesWithUsers, { roomId });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages === undefined) {
    // Loading state
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {messages.map((msg) => (
        <MessageItem 
          key={msg._id}
          message={msg} 
          isCurrentUser={msg.userId === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} /> {/* Anchor for scrolling */} 
    </div>
  );
} 