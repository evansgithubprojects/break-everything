/** Shape returned by `getAnalyticsSummary` / `GET /api/analytics`. */
export interface AnalyticsSummary {
  range: { since: string; until: string };
  totals: { all: number; byEvent: { event: string; count: number }[] };
  uniqueSlugs: number;
  toolActionClicks: number;
  runtimeLifecycleEvents: { event: string; count: number }[];
  runtimeFailureRate: number;
  byUtmCampaign: { campaign: string; count: number }[];
  byDay: { date: string; count: number }[];
  topTools: { slug: string; count: number }[];
  byAction: { action: string; count: number }[];
}
