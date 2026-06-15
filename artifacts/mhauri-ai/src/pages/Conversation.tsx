import { useParams } from "wouter";
import {
  useGetConversationMessages,
  getGetConversationMessagesQueryKey,
} from "@workspace/api-client-react";
import { ChatArea } from "@/components/chat/ChatArea";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStream } from "@/hooks/use-chat-stream";

export default function Conversation() {
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id, 10) : undefined;

  const { data: messages = [], isLoading } = useGetConversationMessages(conversationId!, {
    query: {
      enabled: !!conversationId,
      queryKey: getGetConversationMessagesQueryKey(conversationId!),
    },
  });

  const { sendMessage, isStreaming, localMessages } = useChatStream(conversationId);

  const handleSendMessage = (text: string, imageBase64: string | null) => {
    sendMessage(text, imageBase64);
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1011] relative">
      <ChatArea
        messages={messages}
        localMessages={localMessages}
        isLoading={isLoading}
      />
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isStreaming}
      />
    </div>
  );
}
