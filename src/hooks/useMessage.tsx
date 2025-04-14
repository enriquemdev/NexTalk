import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

export const useMessage = () => {
  const useGetMessagesByRoom = (roomId: Id<"rooms">) => {
    const messages = useQuery(api.messages.getByRoom, {
      roomId,
    });
    return messages;
  };

  const useSendMessage = () => {
    const message = useMutation(api.messages.send);

    return message;
  };
  return {
    useGetMessagesByRoom,
    useSendMessage,
  };
};
