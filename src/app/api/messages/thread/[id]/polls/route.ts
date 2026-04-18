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
    return NextResponse.json({ error: "Guest members cannot create polls." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    question?: string;
    description?: string;
    allowsMultiple?: boolean;
    closesAt?: string | null;
    options?: string[];
  };

  const question = String(payload.question ?? "").trim();
  const options = Array.isArray(payload.options)
    ? payload.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  if (!question || options.length < 2) {
    return NextResponse.json({ error: "Poll question and at least two options are required." }, { status: 400 });
  }

  try {
    const poll = await db.messagePoll.create({
      data: {
        messageThreadId: id,
        question,
        description: String(payload.description ?? "").trim() || null,
        allowsMultiple: Boolean(payload.allowsMultiple),
        closesAt: payload.closesAt ? new Date(payload.closesAt) : null,
        createdByUserId: session.id,
        options: {
          create: options.map((label, index) => ({
            label,
            position: index,
          })),
        },
      },
      include: {
        createdByUser: { select: { id: true, name: true, avatarUrl: true } },
        options: {
          orderBy: { position: "asc" },
          include: {
            votes: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    await dispatchThreadWebhookEvent({
      threadId: id,
      event: "POLL_CREATED",
      payload: {
        pollId: poll.id,
        question: poll.question,
        createdByUserId: session.id,
      },
    });

    return NextResponse.json({ poll });
  } catch (error) {
    console.error("Failed to create poll", error);
    return NextResponse.json({ error: "Unable to create poll." }, { status: 500 });
  }
}
