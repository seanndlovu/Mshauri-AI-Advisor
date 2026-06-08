import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  // Auto-resize textarea
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
    reader.onload = (event) => {
      setImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageBase64(null);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm border-t p-4 flex-shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {imageBase64 && (
          <div className="relative inline-block w-20 h-20 rounded-md overflow-hidden border border-border shadow-sm group">
            <img src={imageBase64} alt="Upload preview" className="w-full h-full object-cover" />
            <button 
              onClick={handleRemoveImage}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="relative flex items-end gap-2 bg-card border shadow-sm rounded-xl pr-2 focus-within:ring-1 focus-within:ring-ring transition-shadow">
          <Button
            variant="ghost"
            size="icon"
            className="mb-1 ml-1 text-muted-foreground hover:text-primary flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            type="button"
            title="Upload photo of crop or pest"
            data-testid="button-upload-image"
          >
            <Camera className="w-5 h-5" />
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
          
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your crops, soil, or livestock..."
            className="min-h-[44px] max-h-[150px] resize-none border-0 shadow-none focus-visible:ring-0 py-3 px-2 bg-transparent text-foreground placeholder:text-muted-foreground"
            disabled={disabled}
            data-testid="input-chat"
          />
          
          <Button
            size="icon"
            className={`mb-1 flex-shrink-0 rounded-lg transition-colors ${
              (message.trim() || imageBase64) && !disabled 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSubmit}
            disabled={(!message.trim() && !imageBase64) || disabled}
            type="button"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-center text-muted-foreground mt-1">
          Mhauri AI can make mistakes. Always verify important farming advice.
        </div>
      </div>
    </div>
  );
}
