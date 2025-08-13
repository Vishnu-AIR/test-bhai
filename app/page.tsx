'use client';


import { useState, useRef, useEffect } from "react";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { simulateToolCall, ToolResult } from "@/lib/tools";
import { Bot, MoreVertical, Phone, Search, User } from "lucide-react";
import { Content } from "@google/generative-ai";


// Define and export the message type
export type Message = {
  role: "user" | "model";
  parts: [{ text: string | ToolResult }];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    // {
    //   role: "model",
    //   parts: [{ text: "Hello! Ask me anything, or try 'weather in New York' to see a tool call." }],
    // },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    setIsLoading(true);
    const userMessage: Message = { role: "user", parts: [{ text }] };
    setMessages(prev => [...prev, userMessage]);

    // Await the result of the async tool call function
    const toolResult = await simulateToolCall(text);
    if (toolResult) {
        const toolMessage: Message = { role: 'model', parts: [{ text: toolResult }] };
        setMessages(prev => [...prev, toolMessage]);
        setIsLoading(false);
        return;
    }

    const apiHistory = messages
      .filter(m => typeof m.parts[0].text === 'string')
      .map(m => ({
        role: m.role,
        parts: m.parts as [{ text: string }]
      })) as Content[];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: apiHistory, message: text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const { text: botResponse } = await response.json();
      const botMessage: Message = { role: "model", parts: [{ text: botResponse }] };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error(error);
      const errorMessage: Message = { role: "model", parts: [{ text: "Sorry, something went wrong. Please try again." }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-80 flex-col border-r bg-gray-50 dark:bg-gray-950 hidden md:flex">
          <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Chats</h2>
          </div>
          <div className="flex-grow overflow-y-auto">
              <div className="p-4 cursor-pointer bg-teal-100/50 dark:bg-teal-900/20 border-l-4 border-teal-500">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-500 rounded-full text-white"><Bot size={24}/></div>
                      <div>
                          <h3 className="font-semibold">Gemini Assistant</h3>
                          <p className="text-sm text-gray-500 truncate">
                              {isLoading ? "Typing..." : typeof messages[messages.length-1]?.parts[0].text === 'string' ? (messages[messages.length-1].parts[0].text as string).substring(0,25) + "..." : "Tool call executed."}
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      </aside>

      <main className="flex flex-col flex-grow">
        <header className="p-4 bg-white dark:bg-gray-800 flex justify-between items-center border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-500 rounded-full text-white"><Bot size={24}/></div>
            <div>
              <h2 className="font-semibold text-lg">Gemini Assistant</h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <Phone className="cursor-pointer" size={22}/>
            <MoreVertical className="cursor-pointer" size={22}/>
          </div>
        </header>

        <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-6">
          {messages?.map((msg, index) => (
            <ChatBubble key={index} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1].role === 'user' && (
            <ChatBubble message={{ role: 'model', parts: [{ text: '...' }] }} />
          )}
        </div>

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </main>
    </div>
  );
}
