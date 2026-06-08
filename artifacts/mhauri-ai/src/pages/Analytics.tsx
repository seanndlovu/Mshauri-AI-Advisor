import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAnalyticsSummary,
  getGetAnalyticsSummaryQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, Globe, RefreshCcw, TrendingUp, Mic, Image as ImageIcon, Send } from "lucide-react";

export default function Analytics() {
  const [days, setDays] = useState(30);
  const queryClient = useQueryClient();

  const { data: summary, isLoading, isFetching } = useGetAnalyticsSummary({
    days
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey({ days }) });
  };

  const maxMessages = Math.max(...(summary?.messagesPerDay?.map(d => d.count) || [1]));

  const eventLabelMap: Record<string, string> = {
    message_received: "Text Messages",
    voice_transcribed: "Voice Notes",
    image_analyzed: "Images Analyzed",
    broadcast_sent: "Broadcasts Sent",
  };

  const eventIconMap: Record<string, any> = {
    message_received: MessageSquare,
    voice_transcribed: Mic,
    image_analyzed: ImageIcon,
    broadcast_sent: Send,
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Analytics</h1>
          <p className="text-sm text-muted-foreground">System usage and engagement metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Messages"
              value={summary?.totalMessages || 0}
              icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
              loading={isLoading}
            />
            <StatCard
              title="Active Farmers"
              value={summary?.totalFarmers || 0}
              icon={<Users className="h-5 w-5 text-green-500" />}
              loading={isLoading}
            />
            <StatCard
              title="Languages Used"
              value={Object.keys(summary?.languageBreakdown || {}).length || 0}
              icon={<Globe className="h-5 w-5 text-orange-500" />}
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Messages Per Day Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Messages Per Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-end justify-between h-48 pt-4">
                    {[...Array(14)].map((_, i) => <Skeleton key={i} className="w-4" style={{ height: `${Math.random() * 80 + 20}%` }} />)}
                  </div>
                ) : !summary?.messagesPerDay?.length ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">No data for this period</div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-end justify-between h-48 pt-4 gap-1">
                      {summary.messagesPerDay.slice(-14).map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t-sm"
                            style={{ height: `${(day.count / maxMessages) * 100}%`, minHeight: '2px' }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {day.count} messages
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-muted-foreground rotate-45 origin-left whitespace-nowrap">
                            {day.date.split('-').slice(1).reverse().join('/')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Language Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Language Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(summary?.languageBreakdown || {}).sort((a,b) => b[1] - a[1]).map(([lang, count]) => {
                      const percentage = (count / (summary?.totalMessages || 1)) * 100;
                      const langLabel = lang === 'en' ? 'English' : lang === 'sn' ? 'Shona' : lang === 'nd' ? 'Ndebele' : lang;
                      return (
                        <div key={lang} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{langLabel}</span>
                            <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${lang === 'en' ? 'bg-blue-500' : lang === 'sn' ? 'bg-green-500' : 'bg-orange-500'}`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Event Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summary?.topEventTypes?.map((event) => {
                    const Icon = eventIconMap[event.eventType] || MessageSquare;
                    return (
                      <div key={event.eventType} className="flex items-center p-4 bg-muted/30 rounded-xl border transition-colors hover:bg-muted/50">
                        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center mr-4 border shadow-sm">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            {eventLabelMap[event.eventType] || event.eventType}
                          </p>
                          <p className="text-xl font-bold">{event.count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value: number | string, icon: React.ReactNode, loading?: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-bold">{value}</p>}
          </div>
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
