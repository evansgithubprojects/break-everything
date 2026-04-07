import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

function makeRequest(ip: string = "192.168.1.1"): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

// Each test uses a unique bucket name to avoid cross-test pollution
let bucketId = 0;
function uniqueBucket(maxRequests = 3, windowSeconds = 60) {
  return { name: `test-${++bucketId}`, maxRequests, windowSeconds };
}

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const config = uniqueBucket(5);
    const req = makeRequest();

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(req, config);
      expect(result).toBeNull();
    }
  });

  it("blocks requests over the limit with 429", () => {
    const config = uniqueBucket(2);
    const req = makeRequest();

    expect(checkRateLimit(req, config)).toBeNull();
    expect(checkRateLimit(req, config)).toBeNull();

    const blocked = checkRateLimit(req, config);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("returns a Retry-After header when blocked", async () => {
    const config = uniqueBucket(1, 120);
    const req = makeRequest();

    checkRateLimit(req, config);
    const blocked = checkRateLimit(req, config);

    expect(blocked).not.toBeNull();
    const retryAfter = parseInt(blocked!.headers.get("Retry-After") || "0");
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(120);
  });

  it("returns proper error body when blocked", async () => {
    const config = uniqueBucket(1);
    const req = makeRequest();

    checkRateLimit(req, config);
    const blocked = checkRateLimit(req, config);

    const body = await blocked!.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("tracks different IPs independently", () => {
    const config = uniqueBucket(1);

    const req1 = makeRequest("10.0.0.1");
    const req2 = makeRequest("10.0.0.2");

    expect(checkRateLimit(req1, config)).toBeNull();
    expect(checkRateLimit(req2, config)).toBeNull();

    // First IP is now blocked, second just hit its limit
    expect(checkRateLimit(req1, config)).not.toBeNull();
    expect(checkRateLimit(req2, config)).not.toBeNull();
  });

  it("tracks different buckets independently", () => {
    const configA = uniqueBucket(1);
    const configB = uniqueBucket(1);
    const req = makeRequest();

    expect(checkRateLimit(req, configA)).toBeNull();
    expect(checkRateLimit(req, configB)).toBeNull();

    // Each bucket has its own limit
    expect(checkRateLimit(req, configA)).not.toBeNull();
    expect(checkRateLimit(req, configB)).not.toBeNull();
  });

  it("resets after the time window expires", () => {
    const config = uniqueBucket(1, 1); // 1 second window
    const req = makeRequest();

    expect(checkRateLimit(req, config)).toBeNull();
    expect(checkRateLimit(req, config)).not.toBeNull();

    // Manually expire the entry by manipulating the store
    // The window is 1s, so we simulate time passing by calling again
    // after the window. We use jest fake timers for this.
    jest.useFakeTimers();
    jest.advanceTimersByTime(1500);

    expect(checkRateLimit(req, config)).toBeNull();

    jest.useRealTimers();
  });

  it("falls back to 'unknown' when no IP headers present", () => {
    const config = uniqueBucket(1);
    const req = new NextRequest("http://localhost:3000/api/test");

    expect(checkRateLimit(req, config)).toBeNull();
    expect(checkRateLimit(req, config)).not.toBeNull();
  });

  it("uses x-real-ip as fallback when x-forwarded-for is missing", () => {
    const config = uniqueBucket(2);
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-real-ip": "172.16.0.1" },
    });

    expect(checkRateLimit(req, config)).toBeNull();
    expect(checkRateLimit(req, config)).toBeNull();
    expect(checkRateLimit(req, config)).not.toBeNull();
  });

  it("uses first IP from x-forwarded-for chain", () => {
    const config = uniqueBucket(1);
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
    });

    expect(checkRateLimit(req, config)).toBeNull();

    // Same first IP but different chain should still be blocked
    const req2 = new NextRequest("http://localhost:3000/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4, 99.99.99.99" },
    });
    expect(checkRateLimit(req2, config)).not.toBeNull();
  });
});
