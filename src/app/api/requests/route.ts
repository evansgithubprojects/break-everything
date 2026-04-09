import { NextRequest, NextResponse } from "next/server";
import {
  createToolRequest,
  getPendingToolRequests,
  getAllToolRequests,
} from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { jsonServerError } from "@/server/api-response";
import { isAllowedHttpUrl } from "@/server/validation";

export async function GET(request: NextRequest) {
  const blocked = rateLimiters.publicRead(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const requests = await getAllToolRequests();
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

  const submittedBy = body.submitted_by?.trim();
  if (submittedBy && submittedBy.length > 200) {
    return NextResponse.json({ error: "submitted_by is too long" }, { status: 400 });
  }

  const link = body.link?.trim();
  if (link && !isAllowedHttpUrl(link)) {
    return NextResponse.json(
      { error: "link must be a valid http(s) URL" },
      { status: 400 }
    );
  }

  try {
    await createToolRequest({
      tool_name: body.tool_name.trim(),
      description: body.description.trim(),
      submitted_by: submittedBy || undefined,
      link: link || undefined,
    });

    const pendingCount = (await getPendingToolRequests()).length;
    return NextResponse.json({ success: true, pendingCount }, { status: 201 });
  } catch (err: unknown) {
    return jsonServerError(err);
  }
}
