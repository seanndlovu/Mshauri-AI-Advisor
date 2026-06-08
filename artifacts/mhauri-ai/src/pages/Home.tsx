import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sprout, Bug, CloudRain, ShieldAlert } from "lucide-react";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatStream } from "@/hooks/use-chat-stream";

export default function Home() {
  const [, setLocation] = useLocation();
  const { sendMessage, isStreaming } = useChatStream();

  const handleSendMessage = (text: string, imageBase64: string | null) => {
    sendMessage(text, imageBase64, (newConvId) => {
      // Navigate to the new conversation immediately
      setLocation(`/conversations/${newConvId}`);
    });
  };

  const handlePromptClick = (text: string) => {
    handleSendMessage(text, null);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg mb-6 rotate-3">
            <Sprout className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4 tracking-tight">
            Mwauya! Welcome to Mhauri AI.
          </h1>
          <p className="text-lg text-muted-foreground text-center max-w-xl mb-12">
            Your expert agricultural companion. Ask questions about crops, livestock, soil health, and pest management in English, Shona, or Ndebele.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
            <PromptCard 
              icon={<Bug className="w-5 h-5 text-secondary" />}
              title="Pest Identification"
              description="Upload a photo of damaged leaves to identify the pest."
              onClick={() => handlePromptClick("I have uploaded a photo of my maize leaves. There are small holes and brown spots. What disease or pest is this and how do I treat it?")}
            />
            <PromptCard 
              icon={<CloudRain className="w-5 h-5 text-blue-500" />}
              title="Soil & Watering"
              description="Get advice on planting schedules and soil prep."
              onClick={() => handlePromptClick("When is the best time to start planting drought-resistant sorghum in Matabeleland, and how should I prepare the soil?")}
            />
            <PromptCard 
              icon={<ShieldAlert className="w-5 h-5 text-destructive" />}
              title="Livestock Health"
              description="Describe symptoms to get care recommendations."
              onClick={() => handlePromptClick("My goats are coughing and have runny noses. What could be the problem and what immediate steps should I take?")}
            />
            <PromptCard 
              icon={<Sprout className="w-5 h-5 text-primary" />}
              title="Crop Yield"
              description="Learn techniques to maximize your harvest."
              onClick={() => handlePromptClick("Ndingawedzera sei goho rangu rechibage gore rino? Ndeapi mafetireza andinofanira kushandisa? (How can I increase my maize yield this year?)")}
            />
          </div>
        </div>
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}

function PromptCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <Card 
      className="p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group border-border shadow-sm hover:shadow-md"
      onClick={onClick}
      data-testid={`card-prompt-${title.replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-background rounded-lg shadow-sm border border-border group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Card>
  );
}
