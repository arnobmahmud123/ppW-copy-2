import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canManageThread, getMessagingAccessContext } from "@/modules/messaging/permissions";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getMessagingAccessContext(session.id);
  if (!access) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const { id } = await context.params;
  const allowed = await canManageThread(access, id);
  if (!allowed) {
    return NextResponse.json({ error: "Only thread admins can invite guests." }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const expiresInDays = typeof payload.expiresInDays === "number" ? payload.expiresInDays : 7;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid guest email is required." }, { status: 400 });
  }

  const invite = await db.messageThreadGuestInvite.create({
    data: {
      messageThreadId: id,
      email,
      name: name || null,
      accessToken: randomBytes(24).toString("hex"),
      invitedByUserId: session.id,
      expiresAt: expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
    },
  });

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      name: invite.name,
      accessToken: invite.accessToken,
      invitedAt: invite.invitedAt.toISOString(),
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    },
  });
}
