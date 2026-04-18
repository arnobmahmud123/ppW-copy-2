import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, canManageThread, getMessagingAccessContext } from "@/modules/messaging";
import { encryptString } from "@/lib/security";

const ALLOWED_EVENTS = [
  "MESSAGE_CREATED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "NOTE_UPDATED",
  "POLL_CREATED",
  "MEETING_CREATED",
] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const { id } = await params;
  const allowed = await canAccessMessageThread(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }
  const canManage = await canManageThread(context, id);
  if (!canManage) {
    return NextResponse.json({ error: "Only thread admins can manage webhooks." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    displayName?: string;
    targetUrl?: string;
    secret?: string;
    subscribedEvents?: string[];
  };

  const displayName = String(payload.displayName ?? "").trim();
  const targetUrl = String(payload.targetUrl ?? "").trim();
  const subscribedEvents = Array.isArray(payload.subscribedEvents)
    ? payload.subscribedEvents.filter((event): event is typeof ALLOWED_EVENTS[number] =>
        ALLOWED_EVENTS.includes(event as typeof ALLOWED_EVENTS[number])
      )
    : [];

  if (!displayName || !targetUrl || subscribedEvents.length === 0) {
    return NextResponse.json({ error: "Webhook name, target URL, and at least one event are required." }, { status: 400 });
  }

  try {
    const webhook = await db.messageThreadWebhook.create({
      data: {
        messageThreadId: id,
        displayName,
        targetUrl,
        secret: encryptString(String(payload.secret ?? "").trim()) || null,
        subscribedEvents: subscribedEvents.join(","),
        createdByUserId: session.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ webhook });
  } catch (error) {
    console.error("Failed to create webhook", error);
    return NextResponse.json({ error: "Unable to save webhook." }, { status: 500 });
  }
}
