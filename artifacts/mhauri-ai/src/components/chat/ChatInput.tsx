import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, FileText } from "lucide-react";

export interface ChatFileAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

interface ChatInputProps {
  onSendMessage: (text: string, imageBase64: string | null, file: ChatFileAttachment | null) => void;
  disabled?: boolean;
}

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<ChatFileAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
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
    setAttachError(null);

    if (file.size > MAX_FILE_BYTES) {
      setAttachError("File is too large. Max size is 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

    if (!isImage && !isDocument) {
      setAttachError("Only images, PDF, Word, and text files are supported — no video or audio.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isImage) {
        setImageBase64(dataUrl);
        setAttachedFile(null);
      } else {
        setAttachedFile({ name: file.name, mimeType: file.type, dataUrl });
        setImageBase64(null);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if ((!message.trim() && !imageBase64 && !attachedFile) || disabled) return;
    onSendMessage(message, imageBase64, attachedFile);
    setMessage("");
    setImageBase64(null);
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-t border-border p-4 flex-shrink-0 ms-theme-transition">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Image preview */}
        {imageBase64 && (
          <div className="relative inline-block w-20 h-20 rounded-xl overflow-hidden border border-border group">
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

        {/* Document preview */}
        {attachedFile && (
          <div className="flex items-center gap-2 w-fit max-w-full bg-card border border-border rounded-xl px-3 py-2">
            <FileText className="w-4 h-4 text-[#22c55e] shrink-0" />
            <span className="text-foreground text-[12px] truncate max-w-[200px]">{attachedFile.name}</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="w-4 h-4 shrink-0 flex items-center justify-center text-muted-foreground hover:text-[#ef4444] transition-colors"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {attachError && (
          <p className="text-[11px] text-[#ef4444]">{attachError}</p>
        )}

        {/* Input row */}
        <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl pr-2 focus-within:border-[#22c55e]/50 transition-colors shadow-sm">
          {/* Attach */}
          <button
            type="button"
            className="mb-1.5 ml-2 p-1.5 text-muted-foreground hover:text-[#22c55e] hover:bg-[#22c55e]/10 rounded-full transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach an image, PDF, Word, or text file"
            data-testid="button-upload-image"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your crops, livestock, or soil…"
            className="flex-1 min-h-[44px] max-h-[150px] resize-none bg-transparent text-foreground placeholder:text-muted-foreground text-[14px] py-3 px-1 focus:outline-none leading-relaxed"
            disabled={disabled}
            data-testid="input-chat"
          />

          {/* Send */}
          <button
            type="button"
            className={`mb-1.5 p-2 rounded-xl flex-shrink-0 transition-colors ${
              (message.trim() || imageBase64 || attachedFile) && !disabled
                ? "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSubmit}
            disabled={(!message.trim() && !imageBase64 && !attachedFile) || disabled}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-center text-muted-foreground">
          Mshauri AI can make mistakes. Always verify important food systems advice.
        </p>
      </div>
    </div>
  );
}
