"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMessage } from "@/hooks/useMessage";
import { useUser } from "@clerk/nextjs";
import { Id } from "convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

export function ChatComponent({
  roomId,
  hostId,
}: {
  roomId: Id<"rooms">;
  hostId: Id<"users">;
}) {
  const { useGetMessagesByRoom } = useMessage();

  const { user } = useUser();

  const messages = useGetMessagesByRoom(roomId);

  if (!messages) return <>No messages in this room</>;

  return (
    <div className="space-y-4">
      {messages?.map((message) => {
        const isCurrentUser = message.message.userId === user?.id;

        return (
          <div
            key={message.message._id}
            className={`flex items-start ${isCurrentUser ? "justify-end" : ""}`}
          >
            {!isCurrentUser && (
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage
                  src={message.user?.image || "/placeholder.svg"}
                  alt={message.user?.name}
                />
                <AvatarFallback>{message.user?.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}

            <div
              className={`max-w-[75%] ${isCurrentUser ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2" : "bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2"}`}
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
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage
                  src={message.user?.image || "/placeholder.svg"}
                  alt={message.user?.name}
                />
                <AvatarFallback>{message.user?.name.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
    </div>
  );
}
