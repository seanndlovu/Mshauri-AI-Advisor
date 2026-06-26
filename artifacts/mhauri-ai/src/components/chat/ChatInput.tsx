import { useState, useRef, useEffect } from "react";
import { Send, Camera, X } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string, imageBase64: string | null) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImageBase64(event.target?.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if ((!message.trim() && !imageBase64) || disabled) return;
    onSendMessage(message, imageBase64);
    setMessage("");
    setImageBase64(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="bg-[#0f1011]/95 backdrop-blur-sm border-t border-[#2F3336] p-4 flex-shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Image preview */}
        {imageBase64 && (
          <div className="relative inline-block w-20 h-20 rounded-xl overflow-hidden border border-[#2F3336] group">
            <img src={imageBase64} alt="Upload preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setImageBase64(null)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="relative flex items-end gap-2 bg-[#16181C] border border-[#2F3336] rounded-2xl pr-2 focus-within:border-[#22c55e]/40 transition-colors">
          {/* Camera */}
          <button
            type="button"
            className="mb-1.5 ml-2 p-1.5 text-[#71767B] hover:text-[#22c55e] hover:bg-[#22c55e]/10 rounded-full transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Upload photo of crop or pest"
            data-testid="button-upload-image"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your crops, livestock, or soil…"
            className="flex-1 min-h-[44px] max-h-[150px] resize-none bg-transparent text-[#E7E9EA] placeholder:text-[#71767B] text-[14px] py-3 px-1 focus:outline-none leading-relaxed"
            disabled={disabled}
            data-testid="input-chat"
          />

          {/* Send */}
          <button
            type="button"
            className={`mb-1.5 p-2 rounded-xl flex-shrink-0 transition-colors ${
              (message.trim() || imageBase64) && !disabled
                ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                : "bg-[#2F3336] text-[#71767B]"
            }`}
            onClick={handleSubmit}
            disabled={(!message.trim() && !imageBase64) || disabled}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-center text-[#71767B]">
          Mshauri AI can make mistakes. Always verify important food systems advice.
        </p>
      </div>
    </div>
  );
}
