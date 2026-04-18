import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, canManageThread, getMessagingAccessContext } from "@/modules/messaging";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const { id, userId } = await params;
  const allowed = await canAccessMessageThread(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }
  const canManage = await canManageThread(context, id);
  if (!canManage) {
    return NextResponse.json({ error: "Only thread admins can remove members." }, { status: 403 });
  }

  try {
    const thread = await db.messageThread.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Channel not found." }, { status: 404 });
    }

    await db.messageThreadParticipant.deleteMany({
      where: {
        messageThreadId: id,
        userId,
      },
    });

    await writeAuditLog({
      actorUserId: session.id,
      action: "message.member_removed",
      entityType: "message_thread",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove member", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
