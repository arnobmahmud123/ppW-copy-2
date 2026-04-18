import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const allowed = await canAccessMessageThread(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { userIds?: string[] };
  const userIds = Array.from(new Set((payload.userIds ?? []).filter(Boolean))).filter((userId) => userId !== session.id);

  if (userIds.length === 0) {
    return NextResponse.json({ error: "Select at least one member." }, { status: 400 });
  }

  // Stub: Simplified implementation
  return NextResponse.json({ success: true, addedMembers: userIds.length });
}
