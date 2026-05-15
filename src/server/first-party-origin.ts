/**
 * Origin used for first-party in-app runtime validation on the server.
 * Prefer explicit override, then public site URL (same as client metadata), then local dev default.
 */
export function getServerFirstPartyOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw =
    String(env.FIRST_PARTY_ORIGIN ?? "").trim() ||
    String(env.NEXT_PUBLIC_SITE_URL ?? "").trim() ||
    "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}
