"use client";
<<<<<<< HEAD
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessage } from "@/hooks/useMessage";
import { Id } from "convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { SmileIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "👏"];
  
const EMOJIS_OPTIONS_UNI_CODE = EMOJI_OPTIONS.map((emoji) => {
  return btoa(unescape(encodeURIComponent(emoji)));
});

export function MessageList({
  roomId,
  hostId,
}: {
  roomId: Id<"rooms">;
  hostId: Id<"users">;
}) {
  console.log(EMOJIS_OPTIONS_UNI_CODE);
  const { useGetMessagesByRoom } = useMessage();
  const { userId } = useCurrentUser();
  const messages = useGetMessagesByRoom(roomId);

  const sendReaction = useMutation(api.reactions.sendRoomReaction);

  console.log(messages);

  const handleAddReaction = async (
    messageId: Id<"messages">,
    emoji: string
  ) => {
    // setMessages((prevMessages) =>
    //   prevMessages.map((message) => {
    //     if (message.id !== messageId) return message;
    //     const updatedReactions = { ...message.reactions };
    //     // If this emoji reaction doesn't exist yet, create it
    //     if (!updatedReactions[emoji]) {
    //       updatedReactions[emoji] = {
    //         emoji,
    //         count: 0,
    //         userIds: [],
    //       };
    //     }
    //     const reaction = updatedReactions[emoji];
    //     const currentUserId = "1"; // Assuming current user is Sarah
    //     // Toggle the reaction
    //     if (reaction.userIds.includes(currentUserId)) {
    //       // User already reacted with this emoji, remove it
    //       reaction.userIds = reaction.userIds.filter(
    //         (id) => id !== currentUserId
    //       );
    //       reaction.count--;
    //     } else {
    //       // User hasn't reacted with this emoji yet, add it
    //       reaction.userIds.push(currentUserId);
    //       reaction.count++;
    //     }
    //     return {
    //       ...message,
    //       reactions: updatedReactions,
    //     };
    //   })
    // );
    if (!userId) {
      console.error("User ID is null. Cannot send reaction.");
      return;
    }
    await sendReaction({ roomId, userId, type: emoji.toString(), messageId });
  };

  // Ref to track the end of the message list
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!messages) return <>No messages in this room</>;

  return (
    <div className="space-y-4 h-[60vh] overflow-y-auto">
      {messages?.map((message) => {
        const isCurrentUser = message.message.userId === userId;

        return (
          <div key={message.message._id} className="space-y-1">
            <div
              className={`flex items-start ${isCurrentUser ? "justify-end" : ""}`}
            >
              {!isCurrentUser && (
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage
                    src={message.user?.image || "/placeholder.svg"}
                    alt={message.user?.name}
                  />
                  <AvatarFallback>
                    {message.user?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[75%] ${isCurrentUser ? "bg-blue-600 text-white rounded-lg rounded-tr-sm px-6 py-2" : "bg-gray-100 rounded-lg rounded-tl-sm px-6 py-2"}`}
              >
                {!isCurrentUser && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">
                      {message.user?.name}
                    </span>
                    {hostId === message.message.userId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`${isCurrentUser ? "text-white" : "text-gray-700"}`}
                >
                  {message.message.content}
                </div>

                <div
                  className={`text-xs mt-1 ${isCurrentUser ? "text-blue-200" : "text-gray-500"} text-right`}
                >
                  {formatDistanceToNow(message.message.createdAt, {
                    addSuffix: true,
                  })}
                </div>
              </div>

              {isCurrentUser && (
                <Avatar className="h-8 w-8 ml-2">
                  <AvatarImage
                    src={message.user?.image || "/placeholder.svg"}
                    alt={message.user?.name}
                  />
                  <AvatarFallback>
                    {message.user?.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {/* Emojis reactions */}
            <div
              className={`flex items-center gap-1 ${isCurrentUser ? "justify-end mr-10" : "ml-10"}`}
            >
              {/* Display existing reactions */}
              {Object.entries(message.reactions || {}).map(
                ([emoji, reaction]) =>
                  reaction.count > 0 && (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        reaction.userIds.includes(userId!)
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      <span className="mr-1">
                        {decodeURIComponent(escape(atob(emoji)))}
                      </span>
                      <span>{reaction.count}</span>
                    </button>
                  )
              )}

              {/* Emoji picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-full p-0"
                    aria-label="Add reaction"
                  >
                    <SmileIcon className="h-4 w-4 text-gray-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2"
                  align={isCurrentUser ? "end" : "start"}
                >
                  <div className="flex gap-2">
                    {EMOJIS_OPTIONS_UNI_CODE.map((emoji) => (
                      <button
                        key={`emoji ${emoji}`}
                        onClick={() => {
                          handleAddReaction(message.message._id, emoji);
                        }}
                        className="text-xl hover:bg-gray-100 p-1 rounded cursor-pointer"
                      >
                        {decodeURIComponent(escape(atob(emoji)))}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      })}
      {/* Invisible div to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
}
=======

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
>>>>>>> privaterooms
