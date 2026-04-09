import { createClient, type Client } from "@libsql/client";

let tursoClient: Client | null = null;

function requireEnv(name: "TURSO_DATABASE_URL" | "TURSO_AUTH_TOKEN"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

/**
 * Creates a singleton Turso client for production workloads.
 * Call this from server-only code paths.
 */
export function getTursoClient(): Client {
  if (!tursoClient) {
    tursoClient = createClient({
      url: requireEnv("TURSO_DATABASE_URL"),
      authToken: requireEnv("TURSO_AUTH_TOKEN"),
    });
  }

  return tursoClient;
}

