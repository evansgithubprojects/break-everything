/**
 * Browser-only analytics helpers (non-blocking; failures are swallowed).
 * POSTs to `/api/events` — see `src/server/analytics-ingest.ts` for allowed payloads.
 */

import { readUtmContext } from "./utm-context";

type RuntimeLifecycleEvent = "runtime_start" | "runtime_ready" | "runtime_error" | "runtime_action";

async function postEvent(payload: { event: string; slug: string; action?: string }): Promise<void> {
  const utm = readUtmContext();
  await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      utm_term: utm.utm_term,
      utm_content: utm.utm_content,
    }),
  });
}

export async function trackToolActionClick(slug: string, action: string): Promise<void> {
  try {
    await postEvent({ event: "tool_action_click", slug, action });
  } catch {
    // non-blocking analytics
  }
}

export async function trackRuntimeLifecycleEvent(
  slug: string,
  event: RuntimeLifecycleEvent,
  action?: string
): Promise<void> {
  try {
    await postEvent({ event, slug, action });
  } catch {
    // non-blocking analytics
  }
}
