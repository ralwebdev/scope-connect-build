// Soft-launch evidence export — JSON/CSV download for founders/operators.
// Mounted inside /ops Soft Launch panel.

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

const RANGES = [
  { label: "Last 7 Days", days: 7 },
  { label: "Last 14 Days", days: 14 },
  { label: "Last 21 Days", days: 21 },
  { label: "Last 30 Days", days: 30 },
];

function downloadFile(name: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flattenCsv(payload: ReturnType<typeof analytics.exportResults>): string {
  const sections: string[] = [];
  // Summary
  sections.push("# summary");
  sections.push("key,value");
  sections.push(`generated_at,${payload.meta.generated_at}`);
  sections.push(`range_days,${payload.meta.range_days}`);
  sections.push(`edition_id,${payload.meta.edition_id}`);
  // NPS
  sections.push("");
  sections.push("# nps");
  sections.push("metric,value");
  for (const [k, v] of Object.entries(payload.results.nps_scores)) sections.push(`${k},${v}`);
  // Feedback
  sections.push("");
  sections.push("# feedback");
  sections.push("metric,value");
  sections.push(`most_common_positive_reason,${payload.results.feedback_reasons.most_common_positive_reason}`);
  sections.push(`most_common_negative_reason,${payload.results.feedback_reasons.most_common_negative_reason}`);
  for (const [k, v] of Object.entries(payload.results.feedback_reasons.raw_tag_counts.positive)) sections.push(`positive.${k},${v}`);
  for (const [k, v] of Object.entries(payload.results.feedback_reasons.raw_tag_counts.negative)) sections.push(`negative.${k},${v}`);
  payload.results.feedback_reasons.feature_requests.forEach((r, i) => {
    sections.push(`request_${i + 1},"${r.replace(/"/g, '""')}"`);
  });
  // Funnel
  sections.push("");
  sections.push("# funnel");
  sections.push("metric,value");
  for (const [k, v] of Object.entries(payload.results.funnel_metrics)) sections.push(`${k},${v}`);
  // Engagement
  sections.push("");
  sections.push("# engagement");
  sections.push("metric,value");
  for (const [k, v] of Object.entries(payload.results.engagement_metrics)) sections.push(`${k},${v}`);
  return sections.join("\n");
}

export function ExportResultsCard() {
  const [days, setDays] = useState(7);
  const [format, setFormat] = useState<"JSON" | "CSV">("JSON");

  const onExport = () => {
    analytics.track("export_results_clicked");
    const payload = analytics.exportResults(days);
    const date = new Date().toISOString().slice(0, 10);
    const range = `${days}d`;
    const ext = format.toLowerCase();
    const name = `scopeconnect-softlaunch-results-${range}-${date}.${ext}`;
    if (format === "JSON") {
      downloadFile(name, "application/json", JSON.stringify(payload, null, 2));
    } else {
      downloadFile(name, "text/csv", flattenCsv(payload));
    }
    toast.success("Evidence exported. Use data to guide next fixes.");
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge className="bg-cyan/15 text-cyan"><Download className="mr-1 h-3 w-3" /> Export results</Badge>
          <h3 className="mt-2 text-base font-semibold text-foreground">Download soft-launch evidence</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Evidence ready to download. Use data to guide next fixes.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date range</div>
          <div className="flex flex-wrap gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => { setDays(r.days); analytics.track("range_selected"); }}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  days === r.days ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format</div>
          <div className="flex gap-1.5">
            {(["JSON", "CSV"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFormat(f); analytics.track("format_selected"); }}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  format === f ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {f === "JSON" ? <FileJson className="h-3 w-3" /> : <FileSpreadsheet className="h-3 w-3" />}
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={onExport} className="mt-4 w-full bg-gradient-brand text-brand-foreground">
        <Download className="mr-1.5 h-3.5 w-3.5" /> Export Results · {RANGES.find((r) => r.days === days)?.label} · {format}
      </Button>
    </Card>
  );
}
