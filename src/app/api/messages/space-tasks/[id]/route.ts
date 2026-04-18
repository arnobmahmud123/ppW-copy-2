import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

function canApproveSpaceTask(roleKeys: string[]): boolean {
  return roleKeys.some((roleKey) =>
    ["owner", "ceo", "md", "admin_support", "coordinator_dispatcher", "qc_reviewer"].includes(roleKey)
  );
}

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

  const payload = (await request.json()) as { action?: "done" | "approve" };
  
  try {
    const task = await db.messageSpaceTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Stub: Simplified implementation
    if (payload.action === "done") {
      return NextResponse.json({ success: true, action: "done" });
    }

    if (payload.action === "approve") {
      if (!canApproveSpaceTask(context.roleKeys)) {
        return NextResponse.json({ error: "Not authorized to approve" }, { status: 403 });
      }
      return NextResponse.json({ success: true, action: "approve" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update task", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
