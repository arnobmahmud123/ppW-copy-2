import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, canManageThread, getMessagingAccessContext } from "@/modules/messaging";

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
    return NextResponse.json({ error: "Only thread admins can add members." }, { status: 403 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userIds = payload.userIds as string[];

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "user IDs are required" }, { status: 400 });
  }

  try {
    const thread = await db.messageThread.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Identify participants securely
    for (const userId of userIds) {
      const userExists = await db.user.findUnique({ where: { id: userId } });
      if (userExists) {
        await db.messageThreadParticipant.upsert({
          where: {
            messageThreadId_userId: {
              messageThreadId: id,
              userId: userId
            }
          },
          update: {},
          create: {
            messageThreadId: id,
            userId: userId,
            addedByUserId: session.id,
            role: "MEMBER",
          }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add members to thread", error);
    return NextResponse.json({ error: "Unable to add members" }, { status: 500 });
  }
}
