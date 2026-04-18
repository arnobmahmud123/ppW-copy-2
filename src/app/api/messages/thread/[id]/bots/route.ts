import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import {
  canAccessMessageThread,
  canComposeInThread,
  canManageThread,
  getMessagingAccessContext,
} from "@/modules/messaging";

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

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    botType?: "REMINDER" | "WORKFLOW" | "AI_ASSISTANT";
    description?: string;
    prompt?: string;
    cadenceMinutes?: number | null;
  };

  const name = String(payload.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Bot name is required." }, { status: 400 });
  }

  const botType = payload.botType ?? "REMINDER";
  const canManage = await canManageThread(context, id);
  const canCompose = await canComposeInThread(context, id);
  const canCreateBot =
    botType === "AI_ASSISTANT" ? canCompose : canManage;

  if (!canCreateBot) {
    return NextResponse.json(
      {
        error:
          botType === "AI_ASSISTANT"
            ? "Only thread members can create AI assistant bots."
            : "Only thread admins can manage reminder or workflow bots.",
      },
      { status: 403 },
    );
  }

  const cadenceMinutes = typeof payload.cadenceMinutes === "number" && payload.cadenceMinutes > 0
    ? Math.floor(payload.cadenceMinutes)
    : null;

  try {
    const bot = await db.messageThreadBot.create({
      data: {
        messageThreadId: id,
        name,
        botType,
        description: String(payload.description ?? "").trim() || null,
        prompt: String(payload.prompt ?? "").trim() || null,
        cadenceMinutes,
        nextRunAt: cadenceMinutes ? new Date(Date.now() + cadenceMinutes * 60 * 1000) : null,
        createdByUserId: session.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ bot });
  } catch (error) {
    console.error("Failed to create thread bot", error);
    return NextResponse.json({ error: "Unable to create bot." }, { status: 500 });
  }
}
