import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "edge";

// Instantiate the OpenAI provider
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Keep interface definitions as they are
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface RoomContent {
  type: "message" | "transcription";
  author: string;
  content: string;
  timestamp: string;
}

export async function POST(req: Request) {
  try {
    const { roomContext, content } = (await req.json()) as {
      roomContext: string;
      content: RoomContent[];
    };

    if (!content || content.length === 0) {
      return new Response("No content provided for summary", { status: 400 });
    }

    // Format all content into a single conversation text (unchanged)
    const conversationText = content
      .map((item) => {
        const time = new Date(item.timestamp).toLocaleTimeString();
        return `[${time}] ${item.author} (${item.type}): ${item.content}`;
      })
      .join("\n\n");

    // Define messages for the prompt (unchanged structure, but compatible with streamText)
    const messages: ChatMessage[] = [
      {
        role: "system" as const,
        content:
          "You are a helpful assistant that creates comprehensive summaries of chat conversations. Your summary MUST be at least 1000 characters long and should capture all important aspects of the discussion including: main topics covered, key points from each participant, decisions made, action items identified, questions raised, and any unresolved issues. Organize the summary in a clear structure with headings for different topics if appropriate. Make sure your response is thorough while still being readable and well-structured.",
      },
      {
        role: "user" as const,
        content: `Please summarize this conversation from ${roomContext}:\n\n${conversationText}`,
      },
    ];

    // Use streamText to generate the streaming response
    const result = await streamText({
      model: openai("gpt-4o"), // Specify the model using the instantiated provider
      messages: messages,
      temperature: 0.7,
      maxTokens: 4000,
    });

    // Return the result's stream directly using toAIStreamResponse()
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error generating summary:", error);
    // Consider more specific error handling if needed
    return new Response("Error generating summary", { status: 500 });
  }
}
