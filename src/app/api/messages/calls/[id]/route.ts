import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import {
  canAccessMessageThread,
  endMessageCall,
  getActiveThreadCall,
  getMessagingAccessContext,
  leaveMessageCall,
  touchMessageCallParticipant,
} from "@/modules/messaging";

function serializeCall(call: any) {
  if (!call) return null;
  return {
    ...call,
    startedAt: call.startedAt instanceof Date ? call.startedAt.toISOString() : call.startedAt,
    endedAt: call.endedAt instanceof Date ? call.endedAt.toISOString() : call.endedAt ?? null,
    participants: Array.isArray(call.participants) ? call.participants.map((participant: any) => ({
      ...participant,
      joinedAt: participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : participant.joinedAt,
      leftAt: participant.leftAt instanceof Date ? participant.leftAt.toISOString() : participant.leftAt ?? null,
      lastSeenAt: participant.lastSeenAt instanceof Date ? participant.lastSeenAt.toISOString() : participant.lastSeenAt,
    })) : [],
  };
}

async function getAuthorizedCall(callId: string, userId: string) {
  const context = await getMessagingAccessContext(userId);
  if (!context) {
    return { context: null, threadId: null };
  }

  const messageCallSession =
    (db as unknown as { messageCallSession?: typeof db.messageCallSession }).messageCallSession;

  if (!messageCallSession) {
    return { context: null, threadId: null };
  }

  const call = await messageCallSession.findUnique({
    where: { id: callId },
    select: { id: true, messageThreadId: true },
  });

  if (!call) {
    return { context, threadId: null };
  }

  const allowed = await canAccessMessageThread(context, call.messageThreadId);
  return { context: allowed ? context : null, threadId: allowed ? call.messageThreadId : null };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { context, threadId } = await getAuthorizedCall(id, session.id);
  if (!context || !threadId) {
    return NextResponse.json({ error: "Call access is not allowed." }, { status: 403 });
  }

  const call = await getActiveThreadCall(threadId);
  return NextResponse.json({ call: call ? serializeCall(call) : null });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { context, threadId } = await getAuthorizedCall(id, session.id);
  if (!context || !threadId) {
    return NextResponse.json({ error: "Call access is not allowed." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    action?: "heartbeat" | "leave" | "end";
    micEnabled?: boolean;
    cameraEnabled?: boolean;
  };

  try {
    if (payload.action === "leave") {
      await leaveMessageCall({ context, callId: id });
    } else if (payload.action === "end") {
      await endMessageCall({ context, callId: id });
    } else {
      await touchMessageCallParticipant({
        context,
        callId: id,
        micEnabled: payload.micEnabled,
        cameraEnabled: payload.cameraEnabled,
      });
    }

    const call = await getActiveThreadCall(threadId);
    return NextResponse.json({ call: call ? serializeCall(call) : null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update call." },
      { status: 400 }
    );
  }
}
