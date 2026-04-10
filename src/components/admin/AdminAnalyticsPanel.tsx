"use client";

import { useCallback, useEffect, useState } from "react";
import type { Tool } from "@/types";

interface AnalyticsSummary {
  range: { since: string; until: string };
  totals: { all: number; byEvent: { event: string; count: number }[] };
  uniqueSlugs: number;
  toolActionClicks: number;
  byDay: { date: string; count: number }[];
  topTools: { slug: string; count: number }[];
  byAction: { action: string; count: number }[];
}

const DAY_OPTIONS = [7, 30, 90] as const;

export default function AdminAnalyticsPanel() {
  const [days, setDays] = useState<number>(7);
  const [toolSlug, setToolSlug] = useState<string>("");
  const [tools, setTools] = useState<Tool[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tools")
      .then((res) => res.json())
      .then((data: { tools?: Tool[] }) => {
        if (!cancelled && data.tools) {
          setTools([...data.tools].sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (d: number, slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(d) });
      if (slug) params.set("slug", slug);
      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) {
        setError(
          res.status === 401
            ? "Session expired. Log in again."
            : res.status === 400
              ? "Invalid tool filter."
              : "Could not load analytics."
        );
        setSummary(null);
        return;
      }
      const data = await res.json();
      setSummary(data.summary as AnalyticsSummary);
    } catch {
      setError("Could not load analytics.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days, toolSlug);
  }, [days, toolSlug, load]);

  const maxDayCount = summary?.byDay.length
    ? Math.max(...summary.byDay.map((x) => x.count), 1)
    : 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-2 min-w-[200px] max-w-md">
          <label htmlFor="admin-analytics-tool" className="block text-xs font-medium text-foreground/50">
            Tool
          </label>
          <select
            id="admin-analytics-tool"
            value={toolSlug}
            onChange={(e) => setToolSlug(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-foreground text-sm focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 transition-colors"
          >
            <option value="">All tools</option>
            {tools.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2 items-stretch sm:items-end">
          <p className="text-sm text-foreground/50 sm:text-right">
            UTC midnight boundaries for the window.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/30"
                    : "text-foreground/40 hover:text-foreground/60"
                }`}
              >
                Last {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass-card p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-6 border border-red-500/20 bg-red-500/5 text-red-400 text-sm">{error}</div>
      )}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="text-2xl font-bold text-foreground">{summary.totals.all}</div>
              <div className="text-xs text-foreground/40 mt-1">Events in range</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-2xl font-bold text-foreground">{summary.toolActionClicks}</div>
              <div className="text-xs text-foreground/40 mt-1">Tool action clicks</div>
            </div>
            <div className="glass-card p-5">
              <div className="text-2xl font-bold text-foreground">{summary.uniqueSlugs}</div>
              <div className="text-xs text-foreground/40 mt-1">
                {toolSlug ? "Distinct slugs (filtered)" : "Distinct slugs"}
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="text-[11px] font-mono text-foreground/50 break-all">
                {new Date(summary.range.since).toLocaleDateString()} →{" "}
                {new Date(summary.range.until).toLocaleDateString()}
              </div>
              <div className="text-xs text-foreground/40 mt-1">Range (local display)</div>
            </div>
          </div>

          {summary.totals.byEvent.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-foreground mb-3">By event type</h3>
              <ul className="space-y-2">
                {summary.totals.byEvent.map((row) => (
                  <li
                    key={row.event}
                    className="flex items-center justify-between text-sm border-b border-card-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-foreground/70">{row.event}</span>
                    <span className="font-semibold text-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`grid grid-cols-1 gap-6 ${toolSlug ? "" : "lg:grid-cols-2"}`}>
            {!toolSlug && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Top tools (clicks)</h3>
                {summary.topTools.length === 0 ? (
                  <p className="text-sm text-foreground/40">No tool clicks in this window.</p>
                ) : (
                  <ul className="space-y-2">
                    {summary.topTools.map((row) => (
                      <li
                        key={row.slug}
                        className="flex items-center justify-between text-sm gap-3"
                      >
                        <span className="font-mono text-foreground/80 truncate">{row.slug}</span>
                        <span className="shrink-0 font-semibold text-accent-purple">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-foreground mb-4">Clicks by action</h3>
              {summary.byAction.length === 0 ? (
                <p className="text-sm text-foreground/40">No actions recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {summary.byAction.map((row) => (
                    <li
                      key={row.action}
                      className="flex items-center justify-between text-sm gap-3"
                    >
                      <span className="font-mono text-foreground/80">{row.action}</span>
                      <span className="shrink-0 font-semibold text-foreground">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Events per day (UTC)</h3>
            {summary.byDay.length === 0 ? (
              <p className="text-sm text-foreground/40">No daily data in this window.</p>
            ) : (
              <ul className="space-y-2">
                {summary.byDay.map((row) => (
                  <li key={row.date} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 font-mono text-foreground/50">{row.date}</span>
                    <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden border border-card-border/50">
                      <div
                        className="h-full bg-accent-purple/40 rounded-lg transition-all"
                        style={{ width: `${(row.count / maxDayCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-medium text-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
