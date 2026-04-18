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
    return NextResponse.json({ error: "Guest members cannot edit shared notes." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    noteId?: string;
    title?: string;
    body?: string;
  };

  const title = String(payload.title ?? "").trim();
  const body = String(payload.body ?? "").trim();

  if (!title || !body) {
    return NextResponse.json({ error: "Note title and content are required." }, { status: 400 });
  }

  try {
    const note = payload.noteId
      ? await db.messageSharedNote.update({
          where: { id: payload.noteId },
          data: {
            title,
            body,
            updatedByUserId: session.id,
          },
          include: {
            createdByUser: { select: { id: true, name: true, avatarUrl: true } },
            updatedByUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        })
      : await db.messageSharedNote.create({
          data: {
            messageThreadId: id,
            title,
            body,
            createdByUserId: session.id,
            updatedByUserId: session.id,
          },
          include: {
            createdByUser: { select: { id: true, name: true, avatarUrl: true } },
            updatedByUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

    await dispatchThreadWebhookEvent({
      threadId: id,
      event: "NOTE_UPDATED",
      payload: {
        noteId: note.id,
        title: note.title,
        updatedByUserId: session.id,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Failed to save shared note", error);
    return NextResponse.json({ error: "Unable to save shared note." }, { status: 500 });
  }
}
