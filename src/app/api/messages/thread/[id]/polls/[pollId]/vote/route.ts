import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, canComposeInThread, getMessagingAccessContext } from "@/modules/messaging";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const { id, pollId } = await params;
  const allowed = await canAccessMessageThread(context, id);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }
  const canCompose = await canComposeInThread(context, id);
  if (!canCompose) {
    return NextResponse.json({ error: "Guest members cannot vote in polls." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { optionIds?: string[] };
  const optionIds = Array.isArray(payload.optionIds)
    ? payload.optionIds.map((value) => String(value)).filter(Boolean)
    : [];

  if (optionIds.length === 0) {
    return NextResponse.json({ error: "Select at least one option." }, { status: 400 });
  }

  try {
    const poll = await db.messagePoll.findUnique({
      where: { id: pollId },
      include: {
        options: { select: { id: true } },
      },
    });

    if (!poll || poll.messageThreadId !== id) {
      return NextResponse.json({ error: "Poll not found." }, { status: 404 });
    }

    const validOptionIds = new Set(poll.options.map((option) => option.id));
    const normalizedOptionIds = optionIds.filter((optionId) => validOptionIds.has(optionId));

    if (normalizedOptionIds.length === 0) {
      return NextResponse.json({ error: "Selected options are invalid." }, { status: 400 });
    }

    if (!poll.allowsMultiple && normalizedOptionIds.length > 1) {
      return NextResponse.json({ error: "This poll only allows one choice." }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      await tx.messagePollVote.deleteMany({
        where: {
          messagePollId: pollId,
          userId: session.id,
        },
      });

      await tx.messagePollVote.createMany({
        data: normalizedOptionIds.map((optionId) => ({
          messagePollId: pollId,
          messagePollOptionId: optionId,
          userId: session.id,
        })),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to vote on poll", error);
    return NextResponse.json({ error: "Unable to submit vote." }, { status: 500 });
  }
}
