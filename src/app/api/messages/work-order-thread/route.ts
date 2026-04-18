export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { MessageVisibilityScope } from "@/generated/prisma";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { createMessageNotifications } from "@/modules/messaging/message-notifications";
import fs from "fs";
import path from "path";

function normalizeVisibilityScope(scope: string): MessageVisibilityScope {
  switch (scope) {
    case MessageVisibilityScope.CONTRACTOR_VISIBLE:
      return MessageVisibilityScope.CONTRACTOR_VISIBLE;
    case MessageVisibilityScope.CLIENT_VISIBLE:
      return MessageVisibilityScope.CLIENT_VISIBLE;
    case MessageVisibilityScope.SYSTEM_ONLY:
      return MessageVisibilityScope.SYSTEM_ONLY;
    case MessageVisibilityScope.TASK_PARTICIPANTS_ONLY:
      return MessageVisibilityScope.TASK_PARTICIPANTS_ONLY;
    case MessageVisibilityScope.INTERNAL_ONLY:
    default:
      return MessageVisibilityScope.INTERNAL_ONLY;
  }
}

async function saveMessageFile(
  file: File
): Promise<{ fileName: string; mimeType: string; sizeBytes: number; storageKey: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const dir = path.join(process.cwd(), "public", "uploads", "messages");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = (file.name || `file-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return {
    fileName: file.name || filename,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageKey: `uploads/messages/${filename}`,
  };
}

function getAttachmentVersionModelFromClient(
  client: unknown
): {
  create: (args: unknown) => Promise<unknown>;
} | null {
  return (
    client as {
      messageAttachmentVersion?: {
        create: (args: unknown) => Promise<unknown>;
      };
    }
  ).messageAttachmentVersion ?? null;
}

/**
 * POST /api/messages/work-order-thread
 * Body: { workOrderId: string; body: string; visibilityScope?: string }
 *
 * 1. Finds or creates a MessageThread linked to the work order.
 * 2. Adds the current user as a participant if not already one.
 * 3. Posts the message to that thread.
 * 4. Returns { threadId, messageId }.
 */
export async function POST(req: Request) {
  try {
    const session = await getAppSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    let workOrderId = "";
    let messageBody = "";
    let visibilityScope = "INTERNAL_ONLY";
    let directFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      workOrderId = String(formData.get("workOrderId") ?? "").trim();
      messageBody = String(formData.get("body") ?? "").trim();
      visibilityScope = String(formData.get("visibilityScope") ?? "INTERNAL_ONLY");
      directFiles = formData
        .getAll("directFiles")
        .filter((file): file is File => file instanceof File && file.size > 0);
    } else {
      const body = (await req.json().catch(() => ({}))) as {
        workOrderId?: string;
        body?: string;
        visibilityScope?: string;
      };

      workOrderId = body.workOrderId?.trim() ?? "";
      messageBody = body.body?.trim() ?? "";
      visibilityScope = body.visibilityScope ?? "INTERNAL_ONLY";
    }

    if (!workOrderId || (!messageBody && directFiles.length === 0)) {
      return NextResponse.json(
        { error: "workOrderId and either body or file attachment are required" },
        { status: 400 }
      );
    }

    // Verify work order exists
    const workOrder = await db.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        id: true,
        title: true,
        workOrderNumber: true,
        assignedContractorId: true,
        assignedCoordinatorId: true,
        assignedProcessorId: true,
        clientId: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 });
    }

    // Find or create the primary thread for this work order
    let thread = await db.messageThread.findFirst({
      where: { workOrderId },
      select: {
        id: true,
        participants: { select: { userId: true } },
      },
    });

    if (!thread) {
      // Collect all stakeholders for this work order thread
      const stakeholderIds = Array.from(
        new Set([
          session.id,
          workOrder.clientId,
          workOrder.assignedContractorId,
          workOrder.assignedCoordinatorId,
          workOrder.assignedProcessorId,
        ].filter(Boolean) as string[])
      );

      thread = await db.messageThread.create({
        data: {
          threadType: "WORK_ORDER",
          title: `WO: ${workOrder.workOrderNumber ?? workOrder.title}`,
          workOrderId,
          participants: {
            create: stakeholderIds.map((userId) => ({ userId })),
          },
        },
        select: {
          id: true,
          participants: { select: { userId: true } },
        },
      });
    } else {
      // Ensure current user is a participant
      const alreadyParticipant = thread.participants.some(
        (p) => p.userId === session.id
      );
      if (!alreadyParticipant) {
        await db.messageThreadParticipant.create({
          data: { messageThreadId: thread.id, userId: session.id },
        });
      }
    }

    const savedFiles: { fileName: string; mimeType: string; sizeBytes: number; storageKey: string }[] = [];
    for (const file of directFiles) {
      try {
        savedFiles.push(await saveMessageFile(file));
      } catch (error) {
        console.error("[work-order-thread upload error]", error);
      }
    }

    if (directFiles.length > 0 && savedFiles.length === 0) {
      return NextResponse.json({ error: "Unable to upload the selected image(s)." }, { status: 500 });
    }

    const effectiveBody =
      messageBody || (savedFiles.length > 0 ? `📎 ${savedFiles.map((file) => file.fileName).join(", ")}` : "");

    // Post the message
    const message = await db.$transaction(async (tx) => {
      const createdMessage = await tx.workOrderMessage.create({
        data: {
          messageThreadId: thread.id,
          workOrderId,
          body: effectiveBody,
          visibilityScope: normalizeVisibilityScope(visibilityScope),
          messageType: "COMMENT",
          authorType: "USER",
          urgency: "NORMAL",
          createdByUserId: session.id,
        },
        select: { id: true },
      });

      if (savedFiles.length > 0) {
        const versionModel = getAttachmentVersionModelFromClient(tx);

        for (const file of savedFiles) {
          const attachment = await tx.messageAttachment.create({
            data: {
              messageId: createdMessage.id,
              createdByUserId: session.id,
              fileName: file.fileName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              storageKey: file.storageKey,
            },
          });

          if (versionModel) {
            await versionModel.create({
              data: {
                messageAttachmentId: attachment.id,
                versionNumber: 1,
                fileName: file.fileName,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                storageKey: file.storageKey,
                createdByUserId: session.id,
              },
            });
          }
        }
      }

      return createdMessage;
    });

    // Update thread's lastMessageAt so it surfaces in the sidebar
    await db.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    await createMessageNotifications({
      threadId: thread.id,
      messageId: message.id,
      senderUserId: session.id,
      body: effectiveBody,
      threadTitle: thread.id ? `WO: ${workOrder.workOrderNumber ?? workOrder.title}` : null,
      workOrderId,
      mentionedUserIds: [],
    });

    return NextResponse.json({ threadId: thread.id, messageId: message.id }, { status: 201 });
  } catch (err) {
    console.error("[work-order-thread error]", err);
    return NextResponse.json(
      { error: "Failed to send work order message" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/work-order-thread?workOrderId=xxx
 * Returns threadId + all messages with author details.
 * This is used by the work order detail page Comments tab.
 */
export async function GET(req: Request) {
  try {
    const session = await getAppSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workOrderId = searchParams.get("workOrderId");

    if (!workOrderId) {
      return NextResponse.json({ error: "workOrderId is required" }, { status: 400 });
    }

    const thread = await db.messageThread.findFirst({
      where: { workOrderId },
      select: {
        id: true,
        title: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            authorType: true,
            messageType: true,
            visibilityScope: true,
            createdAt: true,
            updatedAt: true,
            createdByUserId: true,
            createdByUser: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
              },
            },
            attachments: {
              select: {
                id: true,
                fileName: true,
                mimeType: true,
              },
            },
          },
        },
      },
    });

    const legacyMessages = await db.message.findMany({
      where: { workOrderId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Ensure current user is a participant so they can access the full thread later
    if (thread) {
      const isParticipant = await db.messageThreadParticipant.findFirst({
        where: { messageThreadId: thread.id, userId: session.id },
        select: { id: true },
      });
      if (!isParticipant) {
        await db.messageThreadParticipant.create({
          data: { messageThreadId: thread.id, userId: session.id },
        }).catch(() => {}); // ignore duplicate errors
      }
    }

    const threadedMessages =
      thread?.messages.map((message) => ({
        id: message.id,
        body: message.body,
        authorType: message.authorType,
        messageType: message.messageType,
        visibilityScope: message.visibilityScope,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        createdByUserId: message.createdByUserId,
        createdByUser: message.createdByUser,
        attachments: (message.attachments ?? []).map((attachment) => ({
          ...attachment,
          isImage:
            attachment.mimeType?.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
        })),
      })) ?? [];

    const timeline = [
      ...threadedMessages,
      ...legacyMessages.map((message) => ({
        id: `legacy-${message.id}`,
        body: message.content,
        authorType: "USER",
        messageType: "COMMENT",
        visibilityScope: MessageVisibilityScope.INTERNAL_ONLY,
        createdAt: message.createdAt,
        updatedAt: message.createdAt,
        createdByUserId: message.authorId,
        createdByUser: message.author,
        attachments: [] as Array<{
          id: string;
          fileName: string;
          mimeType: string;
          isImage: boolean;
        }>,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return NextResponse.json({
      threadId: thread?.id ?? null,
      messageCount: timeline.length,
      messages: timeline,
    });
  } catch (err) {
    console.error("[work-order-thread GET error]", err);
    return NextResponse.json({ error: "Failed to get thread info" }, { status: 500 });
  }
}
