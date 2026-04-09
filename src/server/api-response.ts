import { NextResponse } from "next/server";

/** Avoid leaking DB/driver messages to clients in production */
export function jsonServerError(err: unknown): NextResponse {
  const dev = process.env.NODE_ENV === "development";
  const message =
    dev && err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: 500 });
}
