import { NextRequest, NextResponse } from "next/server";
import {
  createToolRequest,
  getPendingToolRequests,
  getAllToolRequests,
} from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requests = getAllToolRequests();
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const blocked = rateLimiters.requestSubmit(request);
  if (blocked) return blocked;

  const body = await request.json();

  if (!body.tool_name?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: "Tool name and description are required" },
      { status: 400 }
    );
  }

  if (body.tool_name.length > 100 || body.description.length > 1000) {
    return NextResponse.json(
      { error: "Tool name or description is too long" },
      { status: 400 }
    );
  }

  try {
    createToolRequest({
      tool_name: body.tool_name.trim(),
      description: body.description.trim(),
      submitted_by: body.submitted_by?.trim() || undefined,
      link: body.link?.trim() || undefined,
    });

    const pendingCount = getPendingToolRequests().length;
    return NextResponse.json({ success: true, pendingCount }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
