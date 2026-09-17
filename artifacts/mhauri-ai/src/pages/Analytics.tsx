import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAnalyticsSummary,
  getGetAnalyticsSummaryQueryKey,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  DollarSign,
  Download,
  Eye,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  MousePointerClick,
  RefreshCcw,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";

export default function Analytics() {
  const [days, setDays] = useState(30);
  const queryClient = useQueryClient();

  const { data: summary, isLoading, isFetching, isError } = useGetAnalyticsSummary({
    days
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey({ days }) });
  };

  const handleExport = () => {
    if (!summary) return;
    const rows: (string | number)[][] = [
      ["Mshauri analytics export", `${days} days`],
      [],
      ["Overview metric", "Value"],
      ["Total messages", summary.totalMessages],
      ["Active farmers", summary.totalFarmers],
      ["Consented page views", summary.consentedUsage.pageViews],
      ["Consented feature actions", summary.consentedUsage.featureActions],
      ["Ad impressions", summary.adTotals.impressions],
      ["Ad clicks", summary.adTotals.clicks],
      ["Ad measured reach", summary.adTotals.uniqueReach],
      ["Ad unique clickers", summary.adTotals.uniqueClickers],
      ["Ad click-through rate", `${summary.adTotals.clickThroughRate}%`],
      [],
      ["Campaign", "Advertiser", "Impressions", "Clicks", "Reach", "CTR", "Estimated value", "Status"],
      ...summary.adCampaigns.map((campaign) => [
        campaign.campaign,
        campaign.advertiserName,
        campaign.impressions,
        campaign.clicks,
        campaign.uniqueReach,
        `${campaign.clickThroughRate}%`,
        formatConfiguredAmount(campaign.currency, campaign.estimatedRevenueCents),
        campaign.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mshauri-analytics-${days}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxMessages = Math.max(...(summary?.messagesPerDay?.map(d => d.count) || [1]));
  const maxAdImpressions = Math.max(...(summary?.adPerformancePerDay?.map(d => d.impressions) || [1]));

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
          <Button variant="outline" onClick={handleExport} disabled={!summary || isFetching} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {isError && (
            <Card className="border-red-500/30">
              <CardContent className="p-5">
                <p className="font-semibold text-red-600">Analytics is only available to the Mshauri Owner.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in with the verified Owner account, then use Admin Desk → Analytics.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
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
            <StatCard
              title="Consented Page Views"
              value={summary?.consentedUsage?.pageViews || 0}
              icon={<Activity className="h-5 w-5 text-purple-500" />}
              loading={isLoading}
            />
            <StatCard
              title="Ad Impressions"
              value={summary?.adTotals?.impressions || 0}
              icon={<Eye className="h-5 w-5 text-emerald-500" />}
              loading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Audience overview
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Anonymous, consented activity only. Page views are not the same as unique people.
              </p>
            </CardHeader>
            <CardContent>
              {!summary?.consentedUsagePerDay?.length ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">No consented audience activity for this period</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MiniMetric label="Page views" value={summary.consentedUsage.pageViews} />
                  <MiniMetric label="Feature actions" value={summary.consentedUsage.featureActions} />
                  <MiniMetric label="Active farmers" value={summary.totalFarmers} />
                </div>
              )}
            </CardContent>
          </Card>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MegaphoneIcon />
                Advert performance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Consent-based, measurable advert delivery from the selected period.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <MiniMetric label="Impressions" value={summary?.adTotals?.impressions || 0} icon={<Eye className="h-4 w-4" />} />
                <MiniMetric label="Clicks" value={summary?.adTotals?.clicks || 0} icon={<MousePointerClick className="h-4 w-4" />} />
                <MiniMetric label="Measured reach" value={summary?.adTotals?.uniqueReach || 0} icon={<Users className="h-4 w-4" />} />
                <MiniMetric label="Unique clickers" value={summary?.adTotals?.uniqueClickers || 0} icon={<Activity className="h-4 w-4" />} />
                <MiniMetric label="Click-through rate" value={`${summary?.adTotals?.clickThroughRate || 0}%`} icon={<TrendingUp className="h-4 w-4" />} />
              </div>

              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : !summary?.adPerformancePerDay?.length ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">Advert tracking will appear here after consented impressions are recorded</div>
              ) : (
                <div>
                  <p className="text-sm font-medium mb-3">Impressions per day</p>
                  <div className="flex items-end gap-1 h-40">
                    {summary.adPerformancePerDay.slice(-30).map((day) => (
                      <div key={day.date} className="flex-1 h-full flex items-end group relative min-w-0">
                        <div
                          className="w-full bg-emerald-500/60 hover:bg-emerald-500 rounded-t-sm min-h-[2px]"
                          style={{ height: `${(day.impressions / maxAdImpressions) * 100}%` }}
                          title={`${day.impressions} impressions, ${day.clicks} clicks`}
                        />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background">
                          {day.impressions} views · {day.clicks} clicks
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>{summary.adPerformancePerDay[0]?.date}</span>
                    <span>{summary.adPerformancePerDay.at(-1)?.date}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use these figures in advertiser conversations. Historical figures begin when advert tracking is enabled.
              </p>
            </CardHeader>
            <CardContent>
              {!summary?.adCampaigns?.length ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">No tracked campaign activity for this period</div>
              ) : (
                <div className="space-y-3">
                  {summary.adCampaigns.map((campaign) => (
                    <div key={campaign.adId} className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold">{campaign.campaign}</p>
                          <p className="text-xs text-muted-foreground">{campaign.advertiserName} · {campaign.placement} · {campaign.status}</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                          <Metric label="Impressions" value={campaign.impressions} />
                          <Metric label="Clicks" value={campaign.clicks} />
                          <Metric label="Reach" value={campaign.uniqueReach} />
                          <Metric label="CTR" value={`${campaign.clickThroughRate}%`} />
                          <Metric label="Est. value" value={formatConfiguredAmount(campaign.currency, campaign.estimatedRevenueCents)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advert placement and page performance</CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.adPlacementPerformance?.length ? (
                <div className="h-20 flex items-center justify-center text-muted-foreground">No placement data for this period</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-3 pr-4">Placement</th>
                        <th className="pb-3 pr-4">Page</th>
                        <th className="pb-3 pr-4 text-right">Impressions</th>
                        <th className="pb-3 pr-4 text-right">Clicks</th>
                        <th className="pb-3 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.adPlacementPerformance.slice(0, 12).map((row) => (
                        <tr key={`${row.placement}-${row.pagePath}`} className="border-b last:border-0">
                          <td className="py-3 pr-4">{row.placement}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{row.pagePath}</td>
                          <td className="py-3 pr-4 text-right">{row.impressions}</td>
                          <td className="py-3 pr-4 text-right">{row.clicks}</td>
                          <td className="py-3 text-right">{row.clickThroughRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anonymous feature interest</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-xs text-muted-foreground">
                  Based only on users who allowed anonymous analytics. No account or conversation details are shown.
                </p>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : !summary?.anonymousFeatureUsage?.length ? (
                  <div className="h-24 flex items-center justify-center text-muted-foreground">No consented analytics yet</div>
                ) : (
                  <div className="space-y-3">
                    {summary.anonymousFeatureUsage.slice(0, 8).map((item) => (
                      <div key={item.feature} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                        <span className="text-sm font-medium capitalize">{item.feature}</span>
                        <span className="text-sm text-muted-foreground">{item.count} views</span>
                      </div>
                    ))}
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

function MiniMetric({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatConfiguredAmount(currency: string, cents: number | null | undefined) {
  return cents === null || cents === undefined
    ? "Not set"
    : `${currency} ${(cents / 100).toFixed(2)}`;
}

function MegaphoneIcon() {
  return <DollarSign className="h-5 w-5 text-emerald-500" />;
}
