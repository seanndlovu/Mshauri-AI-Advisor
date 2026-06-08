import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getGetConversationMessagesQueryKey, 
  getListConversationsQueryKey,
  useCreateConversation 
} from "@workspace/api-client-react";

export type LocalMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  createdAt: string;
};

export function useChatStream(conversationId?: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation();
  
  const createConversationMutateAsync = createConversation.mutateAsync;

  const sendMessage = useCallback(async (
    text: string, 
    imageBase64: string | null, 
    onConversationCreated?: (id: number) => void
  ) => {
    if (!text.trim() && !imageBase64) return;
    
    setIsStreaming(true);
    setStreamError(null);
    
    // Optimistic user message
    const userMsg: LocalMessage = {
      id: Date.now(),
      role: "user",
      content: text,
      imageUrl: imageBase64,
      createdAt: new Date().toISOString()
    };
    
    // Temporary assistant message that will be updated
    const assistantMsg: LocalMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      imageUrl: null,
      createdAt: new Date().toISOString()
    };
    
    setLocalMessages(prev => [...prev, userMsg, assistantMsg]);
    
    try {
      let targetConversationId = conversationId;
      
      // Auto-create conversation if none exists
      if (!targetConversationId) {
        const title = text.substring(0, 50) + (text.length > 50 ? "..." : "");
        const newConv = await createConversationMutateAsync({ data: { title } });
        targetConversationId = newConv.id;
        if (onConversationCreated) {
          onConversationCreated(newConv.id);
        }
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      }
      
      const response = await fetch(`${import.meta.env.BASE_URL}api/chat/conversations/${targetConversationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, imageBase64 })
      });
      
      if (!response.ok) {
        throw new Error("Failed to connect to chat service.");
      }
      
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.content) {
              setLocalMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.role === "assistant") {
                  lastMsg.content += parsed.content;
                }
                return newMsgs;
              });
            }
            
            if (parsed.error) {
              setStreamError(parsed.error);
              setLocalMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.role === "assistant" && !lastMsg.content) {
                  lastMsg.content = "Sorry, I encountered an error: " + parsed.error;
                }
                return newMsgs;
              });
            }
            
            if (parsed.done) {
              // Refresh actual messages
              queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(targetConversationId) });
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
              // Clear local optimistic once we're sure the query will refetch
              setTimeout(() => setLocalMessages([]), 500); 
            }
          } catch (e) {
            console.error("Failed to parse SSE line", line, e);
          }
        }
      }
    } catch (err) {
      console.error("Chat error", err);
      setStreamError(err instanceof Error ? err.message : "An unknown error occurred");
      setLocalMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.role === "assistant" && !lastMsg.content) {
          lastMsg.content = "Sorry, I could not reach the server. Please try again.";
        }
        return newMsgs;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, createConversationMutateAsync, queryClient]);

  return {
    sendMessage,
    isStreaming,
    streamError,
    localMessages
  };
}
