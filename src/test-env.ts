/**
 * Jest setup: trust X-Forwarded-For so tests can vary synthetic client IPs for rate limits.
 * Required for `src/app/api/__tests__/api.test.ts` ingest limit test (fixed IP in `x-forwarded-for`)
 * and any other suite that relies on `getClientIp()` reading that header — see `trustForwardedChain`
 * in `src/server/rate-limit.ts`.
 */
process.env.TRUST_FORWARDED_FOR = "true";
