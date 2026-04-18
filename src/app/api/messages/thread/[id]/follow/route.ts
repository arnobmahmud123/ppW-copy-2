import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

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

  const allowed = await canAccessMessageThread(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }

  const { followed } = (await request.json().catch(() => ({ followed: true }))) as { followed?: boolean };

  if (followed === false) {
    await db.messageThreadFollow.deleteMany({
      where: { messageThreadId: id, userId: session.id },
    });
    return NextResponse.json({ followed: false });
  }

  await db.messageThreadFollow.upsert({
    where: {
      messageThreadId_userId: {
        messageThreadId: id,
        userId: session.id,
      },
    },
    create: {
      messageThreadId: id,
      userId: session.id,
    },
    update: {},
  });

  return NextResponse.json({ followed: true });
}
