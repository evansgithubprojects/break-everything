/** Jest setup: trust X-Forwarded-For so tests can vary synthetic client IPs for rate limits */
process.env.TRUST_FORWARDED_FOR = "true";
