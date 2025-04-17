import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useQuery, useMutation } from "convex/react";
import { useCompletion } from "ai/react";
import { toast } from "sonner";

export const useSummary = (roomId: Id<"rooms">) => {
  const summary = useQuery(api.summaries.getSummary, { roomId });
  const messages = useQuery(api.messages.getByRoom, { roomId }) || [];
  const captions = useQuery(api.captions.getRecentCaptions, { roomId, limit: 1000 }) || [];
  const room = useQuery(api.rooms.get, { roomId });
  const storeSummary = useMutation(api.summaries.storeSummary);

  const { 
    complete: generateStream, 
    completion,
    isLoading: isGenerating,
    error
  } = useCompletion({
    api: "/api/summary",
    onResponse: (response) => {
      if (!response.ok) {
         toast.error("Failed to start summary generation.");
      }
    },
    onFinish: async (prompt, result) => {
      await storeSummary({ roomId, content: completion });
      toast.success("Summary generated successfully!");
    },
    onError: (error) => {
      console.error("Error in completion:", error);
      toast.error(`Failed to generate summary: ${error.message}`);
    }
  });

  const handleGenerateSummary = async () => {
    const currentMessages = messages || [];
    const currentCaptions = captions || [];

    if (currentMessages.length === 0 && currentCaptions.length === 0) {
      toast.error("No messages or transcriptions available for summary generation");
      return;
    }
      
      // Prepare room context
      const roomContext = room 
        ? `Room: "${room.name}" ${room.description ? `- ${room.description}` : ''}`
        : "Chat room";

      // Combine messages and captions data
      const messagesData = currentMessages.map(msg => ({
        type: "message",
        author: msg.user?.name || "Unknown user",
        content: msg.message.content,
        timestamp: new Date(msg.message.createdAt).toISOString()
      }));
      
      const captionsData = currentCaptions.map(cap => ({
        type: "transcription",
        author: cap.user?.name || "Unknown speaker",
        content: cap.caption.content,
        timestamp: new Date(cap.caption.startTime).toISOString()
      }));
      
      // Combine and sort by timestamp
      const allContent = [...messagesData, ...captionsData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      try {
        await generateStream("", { 
          body: { 
            roomContext,
            content: allContent
          }
        });
      } catch (err) {
         console.error("Error calling generateStream:", err);
         toast.error("Failed to initiate summary stream.");
      }
  };

  return {
    summary: summary?.content,
    isGenerating,
    generateSummary: handleGenerateSummary,
    streamingCompletion: completion,
    hasContent: (messages && messages.length > 0) || (captions && captions.length > 0),
    error
  };
}; 