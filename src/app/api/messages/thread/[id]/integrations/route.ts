import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";
import { canManageThread } from "@/modules/messaging";
import { encryptString } from "@/lib/security";

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
    return NextResponse.json({ error: "Only thread admins can manage integrations." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    integrationType?: "GITHUB" | "JIRA" | "NOTION" | "GENERIC";
    displayName?: string;
    workspaceUrl?: string;
    projectKey?: string;
    configJson?: string;
  };

  const displayName = String(payload.displayName ?? "").trim();
  if (!displayName) {
    return NextResponse.json({ error: "Integration name is required." }, { status: 400 });
  }

  try {
    const integration = await db.messageThreadIntegration.create({
      data: {
        messageThreadId: id,
        integrationType: payload.integrationType ?? "GENERIC",
        displayName,
        workspaceUrl: String(payload.workspaceUrl ?? "").trim() || null,
        projectKey: String(payload.projectKey ?? "").trim() || null,
        configJson: encryptString(String(payload.configJson ?? "").trim()) || null,
        createdByUserId: session.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("Failed to create integration", error);
    return NextResponse.json({ error: "Unable to save integration." }, { status: 500 });
  }
}
