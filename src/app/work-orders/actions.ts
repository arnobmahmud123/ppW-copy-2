"use server";

import { requireAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { MessageType, MessageVisibilityScope } from "@/generated/prisma";

export async function createWorkOrderThreadMessageAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const workOrderId = formData.get("workOrderId") as string;
    const threadId = formData.get("threadId") as string;
    const body = formData.get("body") as string;
    const subject = formData.get("subject") as string;
    const visibilityScope = formData.get("visibilityScope") as string;
    const messageType = formData.get("messageType") as string;
    const replyToMessageId = formData.get("replyToMessageId") as string;
    const redirectBasePath = formData.get("redirectBasePath") as string;

    if (!workOrderId || !body) {
      return { success: false, error: "Work order and message body are required" };
    }

    let actualThreadId = threadId;

    // If no thread ID provided, create a new thread for this work order
    if (!actualThreadId) {
      const newThread = await db.messageThread.create({
        data: {
          title: subject || `Work Order ${workOrderId}`,
          workOrderId,
          threadType: "WORK_ORDER",
          participants: {
            create: {
              userId: session.id
            }
          }
        }
      });
      actualThreadId = newThread.id;
    }

    // Create the message
    const message = await db.workOrderMessage.create({
      data: {
        messageThreadId: actualThreadId,
        workOrderId,
        createdByUserId: session.id,
        body,
        subject: subject || null,
        messageType: (messageType as MessageType) || MessageType.COMMENT,
        visibilityScope: (visibilityScope as MessageVisibilityScope) || MessageVisibilityScope.INTERNAL_ONLY,
        parentMessageId: replyToMessageId || null
      }
    });

    // Update thread's updatedAt timestamp
    await db.messageThread.update({
      where: { id: actualThreadId },
      data: { updatedAt: new Date() }
    });

    return { 
      success: true, 
      messageId: message.id,
      threadId: actualThreadId
    };
  } catch (error) {
    console.error("Error creating work order thread message:", error);
    return { success: false, error: "Failed to send message" };
  }
}
