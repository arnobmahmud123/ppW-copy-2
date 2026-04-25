"use server";

import { requireAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

  // Create message channel (thread)
export async function createMessageChannelAction(formData: FormData) {
  let threadId = "";
  try {
    const session = await requireAppSession();
    const rawTitle = formData.get("title");
    const rawBody = formData.get("body");
    const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
    const body = typeof rawBody === "string" ? rawBody.trim() : "";
    const photoFile = formData.get("channelPhoto") as File | null;

    if (!title) {
      return { success: false, error: "Channel name is required" };
    }

    // Handle channel photo upload
    let channelImageUrl: string | null = null;
    if (photoFile && photoFile.size > 0) {
      try {
        const bytes = await photoFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public", "uploads", "channels");
        try {
          await mkdir(uploadDir, { recursive: true });
        } catch {}

        const { randomUUID } = await import("crypto");
        const extension = photoFile.name.includes(".") ? photoFile.name.split(".").pop() : "jpg";
        const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        channelImageUrl = `/uploads/channels/${fileName}`;
      } catch (uploadError) {
        console.error("Error uploading channel photo:", uploadError);
      }
    }

    // Create new message thread
    const thread = await db.messageThread.create({
      data: {
        title,
        channelImageUrl,
        threadType: "GENERAL",
        createdByUserId: session.id,
        participants: {
          create: {
            userId: session.id,
            role: "ADMIN",
          }
        }
      }
    });
    
    threadId = thread.id;

    if (body) {
      // Only create a starter message when the user actually provided one.
      await db.workOrderMessage.create({
        data: {
          messageThreadId: thread.id,
          createdByUserId: session.id,
          body,
          subject: title,
          messageType: "COMMENT",
          visibilityScope: "INTERNAL_ONLY"
        }
      });

      await db.messageThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() }
      });
    }

    revalidatePath("/messages");
  } catch (error) {
    console.error("Error creating message channel:", error);
    return { success: false, error: "Failed to create channel" };
  }
  
  if (threadId) {
    redirect(`/messages?thread=${threadId}`);
  }
}

// Create thread message
export async function createThreadMessageAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;
    const body = formData.get("body") as string;
    const subject = formData.get("subject") as string;
    const visibilityScope = formData.get("visibilityScope") as string;
    const messageType = formData.get("messageType") as string;

    if (!threadId || !body) {
      return { success: false, error: "Thread and message body are required" };
    }

    // Create message in thread
    const message = await db.workOrderMessage.create({
      data: {
        messageThreadId: threadId,
        createdByUserId: session.id,
        body,
        subject: subject || null,
        messageType,
        visibilityScope
      }
    });

    // Update thread timestamp
    await db.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    });

    return { success: true, messageId: message.id };
  } catch (error) {
    console.error("Error creating thread message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

// Update workspace profile photo
export async function updateMessageWorkspaceProfilePhotoAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;
    const photoFile = formData.get("photo") as File;

    if (!threadId || !photoFile) {
      return { success: false, error: "Thread and photo are required" };
    }

    // TODO: Upload photo to storage and update thread
    return { success: true };
  } catch (error) {
    console.error("Error updating workspace profile photo:", error);
    return { success: false, error: "Failed to update photo" };
  }
}

// Mark thread as read
export async function markThreadReadAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    // Mark all messages in thread as read
    await db.messageRead.deleteMany({
      where: {
        message: {
          messageThreadId: threadId
        },
        userId: session.id
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking thread as read:", error);
    return { success: false, error: "Failed to mark thread as read" };
  }
}

// Mark thread as unread
export async function markThreadUnreadAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    // Get first unread message in thread
    const firstMessage = await db.workOrderMessage.findFirst({
      where: { messageThreadId: threadId },
      orderBy: { createdAt: "asc" }
    });

    if (firstMessage) {
      await db.messageRead.create({
        data: {
          messageId: firstMessage.id,
          userId: session.id
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking thread as unread:", error);
    return { success: false, error: "Failed to mark thread as unread" };
  }
}

// Toggle message resolved
export async function toggleMessageResolvedAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const messageId = formData.get("messageId") as string;

    if (!messageId) {
      return { success: false, error: "Message ID is required" };
    }

    const message = await db.workOrderMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    await db.workOrderMessage.update({
      where: { id: messageId },
      data: {
        resolvedAt: message.resolvedAt ? null : new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling message resolved:", error);
    return { success: false, error: "Failed to toggle resolved status" };
  }
}

// Create message escalation
export async function createMessageEscalationAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const messageId = formData.get("messageId") as string;
    const escalatedToUserId = formData.get("escalatedToUserId") as string;
    const reason = formData.get("reason") as string;

    if (!messageId || !escalatedToUserId) {
      return { success: false, error: "Message and user are required" };
    }

    const escalation = await db.messageEscalation.create({
      data: {
        messageId,
        escalatedByUserId: session.id,
        escalatedToUserId,
        reason: reason || null
      }
    });

    return { success: true, escalationId: escalation.id };
  } catch (error) {
    console.error("Error creating escalation:", error);
    return { success: false, error: "Failed to create escalation" };
  }
}

// Resolve message escalation
export async function resolveMessageEscalationAction(formData: FormData) {
  try {
    const escalationId = formData.get("escalationId") as string;

    if (!escalationId) {
      return { success: false, error: "Escalation ID is required" };
    }

    await db.messageEscalation.update({
      where: { id: escalationId },
      data: { resolvedAt: new Date() }
    });

    return { success: true };
  } catch (error) {
    console.error("Error resolving escalation:", error);
    return { success: false, error: "Failed to resolve escalation" };
  }
}

// Update message escalation
export async function updateMessageEscalationAction(formData: FormData) {
  try {
    const escalationId = formData.get("escalationId") as string;
    const reason = formData.get("reason") as string;

    if (!escalationId) {
      return { success: false, error: "Escalation ID is required" };
    }

    await db.messageEscalation.update({
      where: { id: escalationId },
      data: { reason: reason || null }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating escalation:", error);
    return { success: false, error: "Failed to update escalation" };
  }
}

// Add message escalation comment
export async function addMessageEscalationCommentAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const escalationId = formData.get("escalationId") as string;
    const comment = formData.get("comment") as string;

    if (!escalationId || !comment) {
      return { success: false, error: "Escalation and comment are required" };
    }

    // TODO: Add comment to escalation once comment model is defined
    return { success: true };
  } catch (error) {
    console.error("Error adding escalation comment:", error);
    return { success: false, error: "Failed to add comment" };
  }
}

// Mark notification as read
export async function markNotificationReadAction(formData: FormData) {
  return { success: true };
}

// Mark notification as unread
export async function markNotificationUnreadAction(formData: FormData) {
  return { success: true };
}

// Archive notification
export async function archiveNotificationAction(formData: FormData) {
  return { success: true };
}

// Bulk update notifications
export async function bulkUpdateNotificationsAction(formData: FormData) {
  return { success: true };
}

// Save notification preferences
export async function saveNotificationPreferencesAction(formData: FormData) {
  return { success: true };
}

// Mark all notifications as read
export async function markAllNotificationsReadAction(formData: FormData) {
  return { success: true };
}

// Save message template
export async function saveMessageTemplateAction(formData: FormData) {
  return { success: true };
}

// Archive message template
export async function archiveMessageTemplateAction(formData: FormData) {
  return { success: true };
}

// Restore message template
export async function restoreMessageTemplateAction(formData: FormData) {
  return { success: true };
}

// Delete message thread
export async function deleteMessageThreadAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    // Delete the thread and all related messages
    await db.messageThread.delete({
      where: { id: threadId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting message thread:", error);
    return { success: false, error: "Failed to delete thread" };
  }
}

// Block message thread
export async function blockMessageThreadAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    // Check if already blocked
    const existingBlock = await db.messageThreadBlock.findFirst({
      where: {
        messageThreadId: threadId,
        blockedByUserId: session.id
      }
    });

    if (existingBlock) {
      return { success: false, error: "Thread already blocked" };
    }

    // Create a block record
    await db.messageThreadBlock.create({
      data: {
        messageThreadId: threadId,
        blockedByUserId: session.id
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error blocking message thread:", error);
    return { success: false, error: "Failed to block thread" };
  }
}

// Unblock message thread
export async function unblockMessageThreadAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    await db.messageThreadBlock.deleteMany({
      where: {
        messageThreadId: threadId,
        blockedByUserId: session.id
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error unblocking message thread:", error);
    return { success: false, error: "Failed to unblock thread" };
  }
}

// Leave channel
export async function leaveChannelAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const threadId = formData.get("threadId") as string;

    if (!threadId) {
      return { success: false, error: "Thread ID is required" };
    }

    // Remove user from thread participants
    await db.messageThreadParticipant.deleteMany({
      where: {
        messageThreadId: threadId,
        userId: session.id
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error leaving channel:", error);
    return { success: false, error: "Failed to leave channel" };
  }
}

// Block user
export async function blockUserAction(formData: FormData) {
  try {
    const session = await requireAppSession();
    const blockUserId = formData.get("blockUserId") as string;

    if (!blockUserId) {
      return { success: false, error: "User ID is required" };
    }

    // TODO: Implement user blocking once block model is defined
    return { success: true };
  } catch (error) {
    console.error("Error blocking user:", error);
    return { success: false, error: "Failed to block user" };
  }
}
