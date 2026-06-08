import React from 'react';
import { User, Sprout } from "lucide-react";
import { Message } from "@workspace/api-client-react";
import { LocalMessage } from "@/hooks/use-chat-stream";

type CombinedMessage = Message | LocalMessage;

export function MessageBubble({ message }: { message: CombinedMessage }) {
  const isUser = message.role === "user";

  // Extremely basic markdown parser
  const renderContent = (content: string) => {
    if (!content) return null;
    
    // Split by newlines first
    const paragraphs = content.split('\n');
    
    return paragraphs.map((p, pIdx) => {
      // Bold text before a colon at the start of a line
      // e.g. "Diagnosis: Blah" or "**Diagnosis:** Blah"
      let formattedP = p;
      
      // Handle the manual "**Text**:" format
      formattedP = formattedP.replace(/^\*\*(.*?)\*\*:/g, '<strong class="font-semibold text-foreground">$1:</strong>');
      
      // Handle "Text:" format
      if (!formattedP.includes('<strong')) {
        formattedP = formattedP.replace(/^([^:]+):/g, '<strong class="font-semibold text-foreground">$1:</strong>');
      }

      // Handle other basic **bold** tags anywhere
      formattedP = formattedP.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

      if (p.trim() === '') {
        return <div key={pIdx} className="h-2" />; // Spacer for empty lines
      }

      return (
        <p 
          key={pIdx} 
          className="mb-2 last:mb-0 leading-relaxed text-sm md:text-base"
          dangerouslySetInnerHTML={{ __html: formattedP }} 
        />
      );
    });
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} py-4`}>
      <div className={`flex gap-3 md:gap-4 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-sm ${
          isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
        }`}>
          {isUser ? <User className="w-5 h-5" /> : <Sprout className="w-5 h-5" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-secondary text-secondary-foreground rounded-tr-sm' 
              : 'bg-card border border-border text-card-foreground rounded-tl-sm'
          }`}>
            {message.imageUrl && (
              <img 
                src={message.imageUrl} 
                alt="Uploaded" 
                className="max-w-[200px] md:max-w-sm rounded-lg mb-3 object-cover shadow-sm border border-border/50" 
              />
            )}
            <div className="prose-sm max-w-none break-words">
              {renderContent(message.content)}
              {!message.content && !message.imageUrl && message.role === "assistant" && (
                <div className="flex items-center gap-1 h-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse delay-150" />
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
