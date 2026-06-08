import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@workspace/api-client-react";
import { LocalMessage } from "@/hooks/use-chat-stream";

interface ChatAreaProps {
  messages: Message[];
  localMessages: LocalMessage[];
  isLoading: boolean;
}

export function ChatArea({ messages, localMessages, isLoading }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Combine real messages with optimistic local messages, removing duplicates by ID
  const allMessages = [...messages];
  const existingIds = new Set(allMessages.map(m => m.id));
  
  for (const lm of localMessages) {
    if (!existingIds.has(lm.id)) {
      // Cast is safe enough for display purposes since LocalMessage matches Message shape needed
      allMessages.push(lm as any);
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [allMessages.length, localMessages]);

  return (
    <div className="flex-1 overflow-y-auto w-full p-4 md:p-6" ref={scrollRef}>
      <div className="max-w-3xl mx-auto flex flex-col min-h-full justify-end">
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm">Loading conversation...</span>
            </div>
          </div>
        ) : (
          allMessages.map((msg) => (
            <MessageBubble key={`msg-${msg.id}`} message={msg} />
          ))
        )}
      </div>
    </div>
  );
}
