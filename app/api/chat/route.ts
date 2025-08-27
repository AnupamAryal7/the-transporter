// app/api/chat/route.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { NextRequest, NextResponse } from "next/server";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationSession {
  messages: Message[];
  lastActivity: Date;
}

// In-memory storage for conversations
const conversations = new Map<string, ConversationSession>();

// Clean up old conversations (older than 1 hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of conversations.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > CLEANUP_INTERVAL) {
      conversations.delete(sessionId);
    }
  }
}, CLEANUP_INTERVAL);

// === Project knowledge about The-Transporter ===
const PROJECT_SYSTEM_PROMPT: Message = {
  role: "assistant",
  content: `
  Your name is Transporter Assistant.
You are a helpful assistant for a project called **The-Transporter** made by Anupam Aryal and the Team. 
The-Transporter is a modern file sharing application that allows users to:
- Upload, store, and share files securely.
- Generate secure sharing links for others.
- Access files across devices.
- Provide fast, reliable transfers with encryption.
- Focus on user privacy and efficiency.

The complete tutorials for file sharing is:
-1 Upload Your File: Upload any file to our secure platform. Your files are encrypted and stored safely.

-2 Set Security Rules: Define how long your file is available and how many times it can be downloaded.

-3 Share the Link: Share the secure link with anyone who needs access to your file.

-4 Track Downloads: Monitor who accesses your files and receive notifications when they're downloaded.

When answering questions, always give accurate, friendly, and project-specific responses. 
If the question is unrelated to The-Transporter, you may answer normally but keep responses short.
  `,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Check if API key exists
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Google API key" },
        { status: 500 }
      );
    }

    // Get or create conversation session
    let session = conversations.get(sessionId);
    if (!session) {
      session = {
        messages: [PROJECT_SYSTEM_PROMPT],
        lastActivity: new Date(),
      };
      conversations.set(sessionId, session);
    }

    // Add user message to conversation history
    session.messages.push({ role: "user", content: message });
    session.lastActivity = new Date();

    // Initialize the Google Generative AI client
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.5-flash",
    });

    // Convert messages to LangChain format
    const langchainMessages = session.messages.map((msg) => ({
      type: msg.role,
      content: msg.content,
    }));

    // Use the full conversation history
    const response = await llm.invoke(langchainMessages);

    // Add assistant response to conversation history
    session.messages.push({
      role: "assistant",
      content: response.content as string,
    });

    console.log("Conversation messages:", session.messages.length);
    console.log("Latest response:", response.content);

    return NextResponse.json({
      response: response.content,
      sessionId: sessionId,
      messageCount: session.messages.length,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint to retrieve conversation history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = conversations.get(sessionId);

    return NextResponse.json({
      messages: session?.messages || [],
      messageCount: session?.messages.length || 0,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversation" },
      { status: 500 }
    );
  }
}
