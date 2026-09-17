import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";
import { getAdvertiserReport, type AdvertiserReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatGeneratedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(currency: string, cents: number | null) {
  return cents === null ? "Not configured" : `${currency} ${(cents / 100).toFixed(2)}`;
}

function formatCampaignDates(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Campaign dates not specified";
  if (startDate && endDate) return `Campaign dates: ${formatDate(startDate)} – ${formatDate(endDate)}`;
  return `Campaign dates: ${formatDate(startDate ?? endDate ?? "")} onward`;
}

function unavailableReport() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f7f2] px-6 py-12 text-center">
      <div className="max-w-md">
        <img src={`${import.meta.env.BASE_URL}mshauri-logo.png`} alt="Mshauri" className="mx-auto mb-8 h-16 w-16 object-contain" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Mshauri report</p>
        <h1 className="text-3xl font-semibold text-foreground">Report unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This report link is invalid, expired, or no longer available.
        </p>
      </div>
    </main>
  );
}

function ReportMetric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="report-metric rounded-xl border border-[#d8e6d6] bg-[#f7fbf6] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5d7660]">{label}</p>
      <p className="mt-2 tabular-nums text-2xl font-semibold tracking-tight text-[#17351d]">{value}</p>
      {detail && <p className="mt-1 text-xs text-[#6d8170]">{detail}</p>}
    </div>
  );
}

function DailyPerformance({ report }: { report: AdvertiserReport }) {
  const maxImpressions = Math.max(...report.dailyPerformance.map((row) => row.impressions), 1);
  if (!report.dailyPerformance.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#c8d9c6] bg-[#fbfdfb] px-5 py-8 text-center text-sm text-[#6d8170]">
        No consented delivery was recorded during this reporting period.
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 rounded-xl border border-[#d8e6d6] bg-[#fbfdfb] px-3 pb-3 pt-5 sm:gap-2">
        {report.dailyPerformance.map((row) => (
          <div key={row.date} className="group flex h-full min-w-0 flex-1 items-end" title={`${formatDate(row.date)}: ${row.impressions} impressions, ${row.clicks} clicks`}>
            <div
              className="w-full rounded-t-md bg-[#27a951] transition-colors group-hover:bg-[#16853c]"
              style={{ height: `${Math.max((row.impressions / maxImpressions) * 100, 2)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-4 text-[10px] text-[#6d8170]">
        <span>{formatDate(report.dailyPerformance[0].date)}</span>
        <span>{formatDate(report.dailyPerformance.at(-1)?.date ?? report.dailyPerformance[0].date)}</span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#d8e6d6] text-[11px] uppercase tracking-[0.12em] text-[#5d7660]">
              <th className="pb-2 pr-4 font-semibold">Date</th>
              <th className="pb-2 pr-4 text-right font-semibold">Impressions</th>
              <th className="pb-2 text-right font-semibold">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {report.dailyPerformance.map((row) => (
              <tr key={`daily-${row.date}`} className="border-b border-[#edf3ec] last:border-0">
                <td className="py-2 pr-4 text-[#405a44]">{formatDate(row.date)}</td>
                <td className="py-2 pr-4 text-right tabular-nums text-[#17351d]">{row.impressions}</td>
                <td className="py-2 text-right tabular-nums text-[#17351d]">{row.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportDocument({ report }: { report: AdvertiserReport }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="report-shell min-h-screen bg-[#eef5ed] px-4 py-5 text-[#17351d] sm:px-6 sm:py-8">
      <div className="report-toolbar mx-auto mb-5 flex max-w-[920px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[#56705a]">
          <FileText className="h-4 w-4 text-primary" />
          <span>Read-only advertiser report</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={copyLink} className="gap-2 bg-white">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy public link"}
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Download className="h-4 w-4" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="report-paper mx-auto max-w-[920px] rounded-2xl border border-[#d8e6d6] bg-[#fffefa] p-6 shadow-sm sm:p-10">
        <header className="border-b border-[#d8e6d6] pb-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <img src={`${import.meta.env.BASE_URL}mshauri-logo.png`} alt="Mshauri" className="h-12 w-12 object-contain" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Advertiser performance report</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17351d] sm:text-4xl">{report.campaign.name}</h1>
                <p className="mt-2 text-sm text-[#56705a]">
                  {report.campaign.advertiserName} · {formatDate(report.period.from)} – {formatDate(report.period.to)}
                </p>
                <p className="mt-1 text-xs text-[#6d8170]">
                  {formatCampaignDates(report.campaign.startDate, report.campaign.endDate)}
                </p>
              </div>
            </div>
            <div className="text-left text-xs text-[#6d8170] sm:text-right">
              <p>Generated {formatGeneratedDate(report.generatedAt)}</p>
              <p className="mt-1 font-semibold uppercase tracking-[0.12em] text-primary">Read-only</p>
            </div>
          </div>
          <div className="mt-7 rounded-xl border border-[#cfe4ce] bg-[#f0f8ef] px-4 py-3 text-sm leading-6 text-[#456349]">
            Metrics are consent-based and aggregated. This report contains no personal, farmer, account, or conversation data.
          </div>
        </header>

        <section className="border-b border-[#d8e6d6] py-7">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <ReportMetric label="Impressions" value={report.metrics.impressions} />
            <ReportMetric label="Measured reach" value={report.metrics.measuredReach} detail="Consent-based unique exposure" />
            <ReportMetric label="Clicks" value={report.metrics.clicks} />
            <ReportMetric label="CTR" value={`${report.metrics.clickThroughRate}%`} />
            <ReportMetric label="Estimated value" value={formatAmount(report.metrics.currency, report.metrics.estimatedRevenueCents)} />
          </div>
          <p className="mt-4 text-xs leading-5 text-[#6d8170]">
            Measured reach is an aggregated estimate of consented unique exposure and is not a count of identified people.
          </p>
        </section>

        <section className="border-b border-[#d8e6d6] py-7">
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Delivery trend</p>
            <h2 className="mt-1 text-xl font-semibold text-[#17351d]">Daily performance</h2>
          </div>
          <DailyPerformance report={report} />
        </section>

        <section className="py-7">
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Distribution</p>
            <h2 className="mt-1 text-xl font-semibold text-[#17351d]">Placement and page performance</h2>
          </div>
          {!report.placementPerformance.length ? (
            <div className="rounded-xl border border-dashed border-[#c8d9c6] bg-[#fbfdfb] px-5 py-8 text-center text-sm text-[#6d8170]">
              No consented placement activity was recorded during this reporting period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr className="border-b border-[#d8e6d6] text-left text-[11px] uppercase tracking-[0.12em] text-[#5d7660]">
                    <th className="pb-3 pr-4 font-semibold">Placement</th>
                    <th className="pb-3 pr-4 font-semibold">Page</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Impressions</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Clicks</th>
                    <th className="pb-3 text-right font-semibold">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {report.placementPerformance.map((row, index) => (
                    <tr key={`${row.placement}-${row.pagePath}-${index}`} className="border-b border-[#edf3ec] last:border-0">
                      <td className="py-3 pr-4 text-[#405a44]">{row.placement}</td>
                      <td className="py-3 pr-4 text-[#405a44]">{row.pagePath}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[#17351d]">{row.impressions}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-[#17351d]">{row.clicks}</td>
                      <td className="py-3 text-right tabular-nums text-[#17351d]">{row.clickThroughRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="border-t border-[#d8e6d6] pt-6 text-xs leading-5 text-[#6d8170]">
          Prepared by Mshauri. Advertising measurements are derived from consented, aggregated events. Mshauri does not share personal data, farmer identities, message content, or conversation history in this report.
        </footer>
      </article>
    </main>
  );
}

export default function AdvertiserReport() {
  const [, params] = useRoute("/reports/:token");
  const token = params?.token ?? "";
  const [report, setReport] = useState<AdvertiserReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setFailed(true);
      return;
    }
    getAdvertiserReport(token)
      .then((payload) => setReport(payload))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#eef5ed] text-primary">
        <Loader2 className="h-7 w-7 animate-spin" />
      </main>
    );
  }
  if (failed || !report) return unavailableReport();
  return <ReportDocument report={report} />;
}