import React from 'react';
import { Sprout } from "lucide-react";
import { Message } from "@workspace/api-client-react";
import { LocalMessage } from "@/hooks/use-chat-stream";

type CombinedMessage = Message | LocalMessage;

export function MessageBubble({ message }: { message: CombinedMessage }) {
  const isUser = message.role === "user";

  const renderContent = (content: string) => {
    if (!content) return null;
    const paragraphs = content.split('\n');
    return paragraphs.map((p, pIdx) => {
      let formatted = p;
      formatted = formatted.replace(/^\*\*(.*?)\*\*:/g, '<strong class="font-semibold">$1:</strong>');
      if (!formatted.includes('<strong')) {
        formatted = formatted.replace(/^([^:]+):/g, '<strong class="font-semibold">$1:</strong>');
      }
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      if (p.trim() === '') return <div key={pIdx} className="h-2" />;
      return (
        <p key={pIdx} className="mb-2 last:mb-0 leading-relaxed text-sm md:text-[15px]"
          dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} py-3`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center shadow-sm mt-0.5">
            <Sprout className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Bubble */}
        <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl ms-theme-transition ${
            isUser
              ? 'bg-[#22c55e] text-white rounded-tr-sm'
              : 'bg-card border border-border text-card-foreground rounded-tl-sm shadow-sm'
          }`}>
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Attached"
                className="max-w-[200px] md:max-w-xs rounded-xl mb-3 object-cover border border-white/10"
              />
            )}
            <div className="prose-sm max-w-none break-words">
              {renderContent(message.content)}
              {!message.content && !message.imageUrl && !isUser && (
                <div className="flex items-center gap-1 h-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/60 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/60 animate-pulse [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]/60 animate-pulse [animation-delay:300ms]" />
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground px-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
