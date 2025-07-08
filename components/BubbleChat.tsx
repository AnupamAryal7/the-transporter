import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageCircle,
  X,
  Minimize2,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface BubbleChatProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  bubbleColor?: string;
  chatTitle?: string;
  welcomeMessage?: string;
  apiEndpoint?: string;
}

const BubbleChat: React.FC<BubbleChatProps> = ({
  position = "bottom-right",
  bubbleColor = "bg-blue-600",
  chatTitle = "AI Assistant",
  welcomeMessage = "Hi! I'm your AI assistant. How can I help you today?",
  apiEndpoint = "/api/chat",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: welcomeMessage,
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Generate session ID once and keep it persistent
  const [sessionId] = useState(() => crypto.randomUUID());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show notification dot when chat is closed and new message arrives
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      setHasNewMessage(true);
    }
  }, [messages, isOpen]);

  // Clear notification when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    const positions = {
      "bottom-right": "bottom-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "top-right": "top-4 right-4",
      "top-left": "top-4 left-4",
    };
    return positions[position];
  };

  const getChatPositionClasses = () => {
    const positions = {
      "bottom-right": "bottom-20 right-4",
      "bottom-left": "bottom-20 left-4",
      "top-right": "top-20 right-4",
      "top-left": "top-20 left-4",
    };
    return positions[position];
  };

  const callGeminiAPI = async (message: string): Promise<string> => {
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from API");
      }

      const data = await response.json();
      console.log("Response:", data.response);
      console.log("Total messages in conversation:", data.messageCount);

      return data.response;
    } catch (error) {
      console.error("Error calling AI API:", error);
      throw error;
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentMessage = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await callGeminiAPI(currentMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          error instanceof Error
            ? `Error: ${error.message}`
            : "Sorry, I encountered an error. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: "1",
        content: welcomeMessage,
        role: "assistant",
        timestamp: new Date(),
      },
    ]);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed z-50">
      {/* Chat Bubble */}
      <div className={`fixed ${getPositionClasses()}`}>
        <button
          onClick={toggleChat}
          className={`relative w-14 h-14 ${bubbleColor} hover:scale-110 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}

          {/* Notification Dot */}
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}

          {/* Tooltip */}
          {!isOpen && (
            <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Chat with {chatTitle}
            </div>
          )}
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed ${getChatPositionClasses()} w-80 h-96 bg-white rounded-lg shadow-2xl border animate-in slide-in-from-bottom-2 fade-in duration-300`}
        >
          {/* Header */}
          <div
            className={`${bubbleColor} text-white p-4 rounded-t-lg flex items-center justify-between`}
          >
            <div className="flex items-center space-x-3">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-sm">{chatTitle}</h3>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearConversation}
                className="p-1 hover:bg-black/10 rounded text-xs opacity-75 hover:opacity-100 transition-opacity"
                title="Clear chat"
              >
                Clear
              </button>
              <button
                onClick={toggleChat}
                className="p-1 hover:bg-black/10 rounded transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 h-72">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-xs ${
                    message.role === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user" ? bubbleColor : "bg-gray-500"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-3 h-3 text-white" />
                    ) : (
                      <Bot className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg text-xs break-words ${
                      message.role === "user"
                        ? `${bubbleColor} text-white`
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-1 opacity-75 ${
                        message.role === "user" ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !inputValue.trim()}
                className={`px-3 py-2 ${bubbleColor} text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BubbleChat;
