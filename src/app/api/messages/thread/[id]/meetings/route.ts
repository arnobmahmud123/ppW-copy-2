import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, canComposeInThread, getMessagingAccessContext } from "@/modules/messaging";
import { dispatchThreadWebhookEvent } from "@/modules/messaging/thread-webhooks";

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
  const canCompose = await canComposeInThread(context, id);
  if (!canCompose) {
    return NextResponse.json({ error: "Guest members cannot schedule meetings." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    meetingUrl?: string;
  };

  const title = String(payload.title ?? "").trim();
  const startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
  const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;

  if (!title || !startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Meeting title, start time, and end time are required." }, { status: 400 });
  }

  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "Meeting end time must be after the start time." }, { status: 400 });
  }

  try {
    const meeting = await db.messageMeeting.create({
      data: {
        messageThreadId: id,
        title,
        description: String(payload.description ?? "").trim() || null,
        startsAt,
        endsAt,
        location: String(payload.location ?? "").trim() || null,
        meetingUrl: String(payload.meetingUrl ?? "").trim() || null,
        createdByUserId: session.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await dispatchThreadWebhookEvent({
      threadId: id,
      event: "MEETING_CREATED",
      payload: {
        meetingId: meeting.id,
        title: meeting.title,
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        createdByUserId: session.id,
      },
    });

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error("Failed to schedule meeting", error);
    return NextResponse.json({ error: "Unable to schedule meeting." }, { status: 500 });
  }
}
