import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";

/**
 * POST /api/messages/dm
 * Body: { targetUserId: string }
 *
 * Finds or creates a 1:1 direct message thread between the current user
 * and targetUserId, then returns { threadId }.
 */
export async function POST(request: Request) {
  try {
    const session = await getAppSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { targetUserId?: string };
    const targetUserId = body.targetUserId?.trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    if (targetUserId === session.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find all threads where the current user is a participant,
    // with no title and no workOrderId (= DM marker)
    const myThreads = await db.messageThread.findMany({
      where: {
        title: null,
        workOrderId: null,
        participants: { some: { userId: session.id } },
      },
      select: {
        id: true,
        participants: { select: { userId: true } },
      },
    });

    // Find a 2-person thread that includes both users
    const existingThread = myThreads.find(
      (t) =>
        t.participants.length === 2 &&
        t.participants.some((p) => p.userId === targetUserId)
    );

    if (existingThread) {
      return NextResponse.json({ threadId: existingThread.id });
    }

    // Create new DM thread — threadType is required by schema
    const newThread = await db.messageThread.create({
      data: {
        threadType: "GENERAL",
        title: null,
        workOrderId: null,
        participants: {
          create: [
            { userId: session.id, role: "ADMIN" },
            { userId: targetUserId, role: "MEMBER" },
          ],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ threadId: newThread.id }, { status: 201 });
  } catch (err) {
    console.error("[DM route error]", err);
    return NextResponse.json(
      { error: "Failed to create or find DM thread." },
      { status: 500 }
    );
  }
}
