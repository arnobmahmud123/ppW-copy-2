import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import {
  canAccessMessageThread,
  getActiveThreadCall,
  getMessagingAccessContext,
  startOrJoinThreadCall,
} from "@/modules/messaging";

function serializeCall(call: unknown): unknown {
  if (!call || typeof call !== "object") {
    return null;
  }

  const c = call as Record<string, unknown>;
  return {
    ...c,
    startedAt: c.startedAt instanceof Date ? c.startedAt.toISOString() : c.startedAt,
    endedAt: c.endedAt instanceof Date ? c.endedAt.toISOString() : c.endedAt ?? null,
    participants: Array.isArray(c.participants) ? c.participants.map((p: unknown) => {
      const participant = p as Record<string, unknown>;
      return {
        ...participant,
        joinedAt: participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : participant.joinedAt,
        leftAt: participant.leftAt instanceof Date ? participant.leftAt.toISOString() : participant.leftAt ?? null,
        lastSeenAt: participant.lastSeenAt instanceof Date ? participant.lastSeenAt.toISOString() : participant.lastSeenAt,
      };
    }) : [],
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const call = await getActiveThreadCall(id);
  return NextResponse.json({ call: call ? serializeCall(call) : null });
}

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

  const payload = (await request.json().catch(() => ({}))) as { mode?: string };
  const mode = payload.mode === "AUDIO" ? "AUDIO" : "VIDEO";

  try {
    const call = await startOrJoinThreadCall({
      context,
      threadId: id,
      mode,
    });

    if (!call) {
      return NextResponse.json({ error: "Unable to create or join call." }, { status: 500 });
    }

    return NextResponse.json({ call: serializeCall(call) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create or join call." },
      { status: 400 }
    );
  }
}
