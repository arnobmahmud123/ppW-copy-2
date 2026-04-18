import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessage, getMessagingAccessContext } from "@/modules/messaging";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const allowed = await canAccessMessage(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Message access is not allowed." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { action?: "pin" | "save"; value?: boolean };

  if (payload.action === "pin") {
    try {
      const updated = await db.workOrderMessage.update({
        where: { id },
        data: { isPinned: Boolean(payload.value) },
        select: { isPinned: true },
      });

      return NextResponse.json({ isPinned: updated.isPinned });
    } catch (error) {
      console.error("Failed to update pinned state", error);
      return NextResponse.json({ error: "Unable to update pinned state." }, { status: 500 });
    }
  }

  if (payload.action === "save") {
    if (payload.value) {
      try {
        await db.savedMessage.upsert({
          where: {
            messageId_userId: {
              messageId: id,
              userId: session.id,
            },
          },
          create: {
            messageId: id,
            userId: session.id,
          },
          update: {},
        });
      } catch {
        // Stub: Silently ignore errors
      }
      return NextResponse.json({ isSaved: true });
    }

    try {
      await db.savedMessage.deleteMany({
        where: { messageId: id, userId: session.id },
      });
    } catch {
      // Stub: Silently ignore errors
    }
    return NextResponse.json({ isSaved: false });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
