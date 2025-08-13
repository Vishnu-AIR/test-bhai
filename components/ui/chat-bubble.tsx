'use client';

import ReactMarkdown from "react-markdown";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ToolCallResult, ToolResult as ToolResultType } from "@/lib/tools";
import { Message } from "@/app/page"; // Import the Message type from the main page

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { role, parts } = message;
  const isUser = role === 'user';
  const content = parts[0].text;
  const isTool = typeof content === 'object' && content !== null && 'tool' in content;

  const renderContent = () => {
    if (isTool) {
      return <ToolCallResult content={content as ToolResultType} />;
    }
    // Apply prose styles to a wrapper div, not directly to ReactMarkdown
    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{content as string}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <Avatar className="w-8 h-8 border">
          <AvatarFallback><Bot size={18} /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={`max-w-lg px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-teal-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        {renderContent()}
      </div>
      {isUser && (
        <Avatar className="w-8 h-8 border">
          <AvatarFallback><User size={18} /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
