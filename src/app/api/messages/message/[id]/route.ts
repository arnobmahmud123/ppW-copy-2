import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const json = await request.json().catch(() => ({}));
    const body = String(json.body ?? "").trim();

    if (!body) {
      return NextResponse.json({ error: "Message body is required." }, { status: 400 });
    }

    const message = await db.workOrderMessage.findUnique({
      where: { id },
      select: {
        id: true,
        createdByUserId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (message.createdByUserId !== session.id) {
      return NextResponse.json({ error: "Only the author can edit this message." }, { status: 403 });
    }

    const updated = await db.workOrderMessage.update({
      where: { id },
      data: { body },
      select: {
        body: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      body: updated.body,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to update message", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const message = await db.workOrderMessage.findUnique({
      where: { id },
      select: {
        id: true,
        createdByUserId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    if (message.createdByUserId !== session.id) {
      return NextResponse.json({ error: "Only the author can delete this message." }, { status: 403 });
    }

    await db.$transaction([
      db.messageAttachment.deleteMany({
        where: { messageId: id },
      }),
      db.workOrderMessage.update({
        where: { id },
        data: {
          body: "This message was deleted by the author.",
          messageType: "SYSTEM_EVENT",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
