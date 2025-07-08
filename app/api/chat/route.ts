import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { NextRequest, NextResponse } from "next/server";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message } = body;

    // Check if API key exists
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Google API key" },
        { status: 500 }
      );
    }

    // Initialize the Google Generative AI client
    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.5-flash",
    });

    // Build conversation messages
    const messages = [
      // ...conversationHistory,
      { role: "user", content: message },
    ];

    // Call the LLM
    const response = await llm.invoke(messages);
    console.log(response);
    console.log("Result:", response.content);

    return NextResponse.json({
      response: response.content,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
