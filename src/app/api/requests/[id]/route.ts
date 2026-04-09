import { NextRequest, NextResponse } from "next/server";
import { updateToolRequestStatus, deleteToolRequest } from "@/server/db";
import { isAuthenticated } from "@/server/auth";
import { rateLimiters } from "@/server/rate-limit";
import { parsePositiveIntId } from "@/server/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parsePositiveIntId(id);
  if (numericId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { status } = await request.json();

  if (!["pending", "approved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await updateToolRequestStatus(numericId, status);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = rateLimiters.adminWrite(request);
  if (blocked) return blocked;

  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numericId = parsePositiveIntId(id);
  if (numericId === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await deleteToolRequest(numericId);
  return NextResponse.json({ success: true });
}
