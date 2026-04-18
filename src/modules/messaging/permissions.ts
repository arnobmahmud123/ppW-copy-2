// Messaging Permissions - Real database integration

import { MessageVisibilityScope } from "@/generated/prisma";
import type { MessagingAccessContext } from "@/modules/messaging/types";
import { db } from "@/lib/db";

type ThreadMembership = {
  role: "ADMIN" | "MEMBER" | "GUEST";
};

export async function getMessagingAccessContext(userId: string): Promise<MessagingAccessContext | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return {
      userId,
      userType: user.role,
      teamId: null,
      vendorCompanyId: null,
      clientIds: [],
      roleKeys: [user.role.toLowerCase()],
      permissionKeys: [`role:${user.role.toLowerCase()}`]
    };
  } catch (error) {
    console.error('Error getting messaging access context:', error);
    return null;
  }
}

export function getReadableMessageScopes(_context: MessagingAccessContext): MessageVisibilityScope[] {
  // Stub: Return empty array
  return [];
}

export function getComposableMessageScopes(_context: MessagingAccessContext): MessageVisibilityScope[] {
  // Stub: Return empty array
  return [];
}

export function assertCanComposeMessageScope(
  _context: MessagingAccessContext,
  _scope: MessageVisibilityScope
): void {
  // Stub: Do nothing
}

export function canManageMessageTemplates(_context: MessagingAccessContext): boolean {
  // Stub: Return false
  return false;
}

export function buildMessageVisibilityWhere(_context: MessagingAccessContext): Record<string, unknown> {
  // Stub: Return empty object
  return {};
}

export function buildMessageThreadVisibilityWhere(_context: MessagingAccessContext): Record<string, unknown> {
  // Stub: Return empty object
  return {};
}

export function buildUnreadMessageWhere(_context: MessagingAccessContext): Record<string, unknown> {
  // Stub: Return empty object
  return {};
}

export async function canAccessMessageThread(
  context: MessagingAccessContext,
  threadId: string
): Promise<boolean> {
  try {
    const membership = await db.messageThreadParticipant.findUnique({
      where: {
        messageThreadId_userId: {
          messageThreadId: threadId,
          userId: context.userId,
        },
      },
      select: { id: true },
    });

    return Boolean(membership);
  } catch (error) {
    console.error("Error checking message thread access:", error);
    return false;
  }
}

export async function getThreadMembership(
  context: MessagingAccessContext,
  threadId: string
): Promise<ThreadMembership | null> {
  try {
    const membership = await db.messageThreadParticipant.findUnique({
      where: {
        messageThreadId_userId: {
          messageThreadId: threadId,
          userId: context.userId,
        },
      },
      select: {
        role: true,
      },
    });

    return membership ? { role: membership.role as ThreadMembership["role"] } : null;
  } catch (error) {
    console.error("Error loading thread membership:", error);
    return null;
  }
}

export async function canComposeInThread(
  context: MessagingAccessContext,
  threadId: string
): Promise<boolean> {
  const membership = await getThreadMembership(context, threadId);
  return Boolean(membership && membership.role !== "GUEST");
}

export async function canManageThread(
  context: MessagingAccessContext,
  threadId: string
): Promise<boolean> {
  const membership = await getThreadMembership(context, threadId);
  return Boolean(membership && membership.role === "ADMIN");
}

export async function canAccessMessage(
  context: MessagingAccessContext,
  messageId: string
): Promise<boolean> {
  try {
    const message = await db.workOrderMessage.findUnique({
      where: { id: messageId },
      select: { messageThreadId: true },
    });

    if (!message) {
      return false;
    }

    return canAccessMessageThread(context, message.messageThreadId);
  } catch (error) {
    console.error("Error checking message access:", error);
    return false;
  }
}

export async function listVisibleMessageThreads(_context: MessagingAccessContext): Promise<unknown[]> {
  // Stub: Return empty array
  return [];
}

export async function listVisibleMessages(_context: MessagingAccessContext): Promise<unknown[]> {
  // Stub: Return empty array
  return [];
}

export async function countUnreadMessages(_context: MessagingAccessContext): Promise<number> {
  // Stub: Return 0
  return 0;
}
