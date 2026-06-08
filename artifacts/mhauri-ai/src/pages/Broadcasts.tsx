import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBroadcasts,
  getListBroadcastsQueryKey,
  useSendBroadcast,
  useListFarmers,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Send, History, Users, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function Broadcasts() {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: broadcasts, isLoading: isLoadingBroadcasts } = useListBroadcasts();
  const { data: farmers } = useListFarmers({ isActive: true });
  const sendBroadcast = useSendBroadcast();

  const activeFarmerCount = farmers?.length || 0;

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await sendBroadcast.mutateAsync({ data: { message } });
      toast({ title: "Broadcast sent", description: `Message queued for ${activeFarmerCount} farmers.` });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: getListBroadcastsQueryKey() });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send broadcast." });
    }
  };

  const totalSent = useMemo(() => 
    broadcasts?.reduce((sum, b) => sum + (b.status === "sent" ? b.recipientCount : 0), 0) || 0,
    [broadcasts]
  );

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Broadcasts</h1>
          <p className="text-sm text-muted-foreground">{totalSent} total messages delivered</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {/* Compose Card */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Compose New Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Type your message to all active farmers..."
                  className="min-h-[160px] resize-none pr-12 text-base"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                />
                <div className={`absolute bottom-3 right-3 text-xs ${message.length >= 900 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {message.length}/1000
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Target Audience</p>
                  <p className="text-muted-foreground">This will be sent to all <strong>{activeFarmerCount}</strong> active farmers currently registered.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-between items-center py-4">
              <p className="text-xs text-muted-foreground max-w-[60%]">
                Tip: Keep messages concise and clear. Use local languages if possible for better engagement.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!message.trim() || sendBroadcast.isPending} className="px-8">
                    {sendBroadcast.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send to All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send Broadcast?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will send the message to all {activeFarmerCount} active farmers. This action cannot be undone and may take a few minutes to complete.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSend} className="bg-primary hover:bg-primary/90">
                      Confirm & Send
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>

          {/* History */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent History
            </h2>
            
            {isLoadingBroadcasts ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : broadcasts?.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-background">
                <p className="text-muted-foreground">No broadcast history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {broadcasts?.map((b) => (
                  <Card key={b.id} className="bg-background hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between gap-4 mb-2">
                        <p className="text-sm flex-1 line-clamp-2">{b.message}</p>
                        <Badge className={
                          b.status === 'sent' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                          b.status === 'failed' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                          'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                        }>
                          {b.status === 'sending' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                          {b.status === 'sent' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {b.status === 'failed' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {b.recipientCount} Recipients
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {b.sentAt ? format(new Date(b.sentAt), "MMM dd, yyyy HH:mm") : format(new Date(b.createdAt), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )).reverse()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
