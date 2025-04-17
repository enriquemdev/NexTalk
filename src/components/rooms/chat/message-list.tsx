"use client";
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
