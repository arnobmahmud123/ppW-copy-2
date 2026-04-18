// Messaging Queries - Real database queries
import type { MessagingAccessContext } from "@/modules/messaging/types";
import { db } from "@/lib/db";
import { getActiveThreadCall } from "@/modules/messaging/call-service";

type MessageAttachmentVersionRecord = {
  id: string;
  messageAttachmentId: string;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
};

type MessageSharedNoteRecord = {
  id: string;
  messageThreadId: string;
  title: string;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
  updatedByUser: { id: string; name: string; avatarUrl: string | null } | null;
};

type MessagePollRecord = {
  id: string;
  question: string;
  description: string | null;
  allowsMultiple: boolean;
  closesAt: Date | string | null;
  createdAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
  options: Array<{
    id: string;
    label: string;
    position: number;
    votes: Array<{
      id: string;
      userId: string;
      createdAt: Date | string;
      user: { id: string; name: string; avatarUrl: string | null };
    }>;
  }>;
};

type MessageMeetingRecord = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  location: string | null;
  meetingUrl: string | null;
  status: string;
  createdAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
};

type MessageThreadBotRecord = {
  id: string;
  name: string;
  botType: string;
  description: string | null;
  prompt: string | null;
  cadenceMinutes: number | null;
  enabled: boolean;
  nextRunAt: Date | string | null;
  lastRunAt: Date | string | null;
  createdAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
};

type MessageThreadIntegrationRecord = {
  id: string;
  integrationType: string;
  displayName: string;
  workspaceUrl: string | null;
  projectKey: string | null;
  configJson: string | null;
  enabled: boolean;
  createdAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
};

type MessageThreadWebhookRecord = {
  id: string;
  displayName: string;
  targetUrl: string;
  subscribedEvents: string;
  enabled: boolean;
  lastTriggeredAt: Date | string | null;
  lastStatus: string | null;
  createdAt: Date | string;
  createdByUser: { id: string; name: string; avatarUrl: string | null } | null;
};

function getMessageAttachmentVersionModel() {
  return (
    db as unknown as {
      messageAttachmentVersion?: {
        findMany: (args: unknown) => Promise<MessageAttachmentVersionRecord[]>;
      };
    }
  ).messageAttachmentVersion;
}

function getMessageSharedNoteModel() {
  return (
    db as unknown as {
      messageSharedNote?: {
        findMany: (args: unknown) => Promise<MessageSharedNoteRecord[]>;
      };
    }
  ).messageSharedNote;
}

function getMessagePollModel() {
  return (
    db as unknown as {
      messagePoll?: {
        findMany: (args: unknown) => Promise<MessagePollRecord[]>;
      };
    }
  ).messagePoll;
}

function getMessageMeetingModel() {
  return (
    db as unknown as {
      messageMeeting?: {
        findMany: (args: unknown) => Promise<MessageMeetingRecord[]>;
      };
    }
  ).messageMeeting;
}

function getMessageThreadBotModel() {
  return (
    db as unknown as {
      messageThreadBot?: {
        findMany: (args: unknown) => Promise<MessageThreadBotRecord[]>;
      };
    }
  ).messageThreadBot;
}

function getMessageThreadIntegrationModel() {
  return (
    db as unknown as {
      messageThreadIntegration?: {
        findMany: (args: unknown) => Promise<MessageThreadIntegrationRecord[]>;
      };
    }
  ).messageThreadIntegration;
}

function getMessageThreadWebhookModel() {
  return (
    db as unknown as {
      messageThreadWebhook?: {
        findMany: (args: unknown) => Promise<MessageThreadWebhookRecord[]>;
      };
    }
  ).messageThreadWebhook;
}

function getUserNotificationPreferenceModel() {
  return (
    db as unknown as {
      userNotificationPreference?: {
        findUnique: (args: unknown) => Promise<{
          notifyOnMentions: boolean;
          notifyOnKeywords: boolean;
          keywordList: string | null;
          dndEnabled: boolean;
          dndStartMinutes: number | null;
          dndEndMinutes: number | null;
        } | null>;
      };
    }
  ).userNotificationPreference;
}

function getMessageThreadNotificationPreferenceModel() {
  return (
    db as unknown as {
      messageThreadNotificationPreference?: {
        findUnique: (args: unknown) => Promise<{
          level: "ALL" | "MENTIONS_ONLY" | "MUTED";
          mutedUntil: Date | null;
          snoozedUntil: Date | null;
          customKeywords: string | null;
        } | null>;
      };
    }
  ).messageThreadNotificationPreference;
}

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return "Member";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCatchupSummary(input: {
  threadTitle: string | null;
  workOrderNumber: string | null | undefined;
  messages: Array<{
    body: string;
    messageType: string;
    createdByUser: { name: string } | null;
  }>;
  spaceTasks: Array<{ title: string; status: string; dueAt: Date | null }>;
  pinnedCount: number;
}) {
  const summary: string[] = [];
  const recentMessages = input.messages
    .filter((message) => message.messageType !== "SYSTEM_EVENT" && message.body.trim())
    .slice(-3)
    .reverse();

  if (recentMessages.length > 0) {
    const latest = recentMessages[0];
    summary.push(
      `${latest.createdByUser?.name ?? "A team member"} last said: ${latest.body.replace(/\s+/g, " ").slice(0, 140)}${
        latest.body.length > 140 ? "..." : ""
      }`
    );
  }

  const openTasks = input.spaceTasks.filter((task) => task.status === "OPEN");
  if (openTasks.length > 0) {
    const nextDue = openTasks
      .filter((task) => task.dueAt)
      .sort((a, b) => (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER))[0];

    summary.push(
      nextDue?.dueAt
        ? `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} in this thread. Next due ${nextDue.dueAt.toLocaleDateString()}.`
        : `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} are still awaiting completion.`
    );
  }

  if (input.pinnedCount > 0) {
    summary.push(`${input.pinnedCount} pinned message${input.pinnedCount === 1 ? "" : "s"} are saved for quick reference.`);
  }

  if (summary.length === 0) {
    summary.push(
      `No catch-up highlights yet for ${input.threadTitle ?? input.workOrderNumber ?? "this thread"}. New messages will appear here once the conversation picks up.`
    );
  }

  return summary;
}

export async function getMessageThreadsWorkspace(
  context: MessagingAccessContext,
  filters?: Record<string, unknown>
): Promise<any> {
  try {
    const threads = await db.messageThread.findMany({
      where: {
        participants: {
          some: {
            userId: context.userId
          }
        }
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
        },
        workOrder: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return {
      threads: threads || [],
      totals: { all: threads?.length || 0, unread: 0 },
      filters: filters || {}
    };
  } catch (error) {
    console.error('Error fetching message threads:', error);
    return {
      threads: [],
      totals: { all: 0, unread: 0 },
      filters: filters || {}
    };
  }
}

export async function getMessageThreadDetail(
  context: MessagingAccessContext,
  threadId: string
): Promise<any> {
  try {
    const thread = await db.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            createdByUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
            quotedMessage: true
          }
        },
        participants: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } }
        },
        workOrder: true
      }
    });
    return thread;
  } catch (error) {
    console.error('Error fetching thread detail:', error);
    return null;
  }
}

export async function getThreadMessages(
  context: MessagingAccessContext,
  threadId: string,
  options?: { skip?: number; take?: number }
): Promise<any[]> {
  try {
    const messages = await db.workOrderMessage.findMany({
      where: { messageThreadId: threadId },
      orderBy: { createdAt: 'asc' },
      skip: options?.skip || 0,
      take: options?.take || 50,
      include: {
        createdByUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        quotedMessage: true
      }
    });
    return messages || [];
  } catch (error) {
    console.error('Error fetching thread messages:', error);
    return [];
  }
}

export async function getEscalationsWorkspace(
  context: MessagingAccessContext,
  filters?: Record<string, unknown>
): Promise<any> {
  try {
    const escalations = await db.messageEscalation.findMany({
      where: {
        OR: [
          { escalatedToUserId: context.userId },
          { escalatedByUserId: context.userId }
        ]
      },
      include: {
        message: {
          include: {
            messageThread: true
          }
        },
        escalatedByUser: { select: { id: true, name: true } },
        escalatedToUser: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      escalations: escalations || [],
      owners: [],
      filters: filters || {},
      totals: { open: escalations?.length || 0, overdue: 0, unowned: 0 }
    };
  } catch (error) {
    console.error('Error fetching escalations:', error);
    return {
      escalations: [],
      owners: [],
      filters: filters || {},
      totals: { open: 0, overdue: 0, unowned: 0 }
    };
  }
}

export async function getNotificationsWorkspace(
  context: MessagingAccessContext,
  filters?: Record<string, unknown>
): Promise<any> {
  return {
    notifications: [],
    categories: [],
    filters: filters || {},
    totals: { unread: 0, total: 0 }
  };
}

export async function getNotificationDetail(
  context: MessagingAccessContext,
  notificationId: string
): Promise<any> {
  return null;
}

export async function markMessageAsRead(
  context: MessagingAccessContext,
  messageId: string
): Promise<void> {
  try {
    await db.messageRead.create({
      data: {
        messageId: messageId,
        userId: context.userId
      }
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
}

export async function markThreadAsRead(
  context: MessagingAccessContext,
  threadId: string
): Promise<void> {
  try {
    const messages = await db.workOrderMessage.findMany({
      where: {
        messageThreadId: threadId,
        createdByUserId: { not: context.userId }
      },
      select: { id: true }
    });
    
    await Promise.all(
      messages.map(msg => 
        db.messageRead.create({
          data: {
            messageId: msg.id,
            userId: context.userId
          }
        })
      )
    );
  } catch (error) {
    console.error('Error marking thread as read:', error);
  }
}

export async function getMessageThreadWorkspace(
  options: { context: MessagingAccessContext; threadId: string }
): Promise<any> {
  try {
    const now = new Date();
    const thread = await db.messageThread.findUnique({
      where: { id: options.threadId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                presence: {
                  select: {
                    status: true
                  }
                }
              }
            },
            quotedMessage: {
              include: {
                createdByUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatarUrl: true,
                    presence: {
                      select: {
                        status: true
                      }
                    }
                  }
                }
              }
            },
            mentions: {
              include: {
                mentionedUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                  }
                }
              }
            },
            attachments: true,
            savedByUsers: {
              where: {
                userId: options.context.userId
              },
              select: {
                id: true
              }
            }
          },
        },
        guestInvites: {
          where: {
            revokedAt: null,
          },
          orderBy: { invitedAt: "desc" },
          select: {
            id: true,
            email: true,
            name: true,
            accessToken: true,
            invitedAt: true,
            expiresAt: true,
            acceptedAt: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                presence: {
                  select: {
                    status: true
                  }
                }
              }
            }
          }
        },
        workOrder: {
          include: {
            client: true,
            creator: true,
            assignedContractor: true,
            assignedCoordinator: true,
            assignedProcessor: true
          }
        }
      }
    });

    if (!thread) {
      return null;
    }

    const threadMessages = (thread.messages || []).filter((message: { expiresAt?: Date | null }) => {
      return !message.expiresAt || message.expiresAt > now;
    });
    const embeddedGuestInvites = (thread.guestInvites || []).filter((invite: { expiresAt?: Date | null }) => {
      return !invite.expiresAt || invite.expiresAt > now;
    });

    const userNotificationPreferenceModel = getUserNotificationPreferenceModel();
    const threadNotificationPreferenceModel = getMessageThreadNotificationPreferenceModel();
    const sharedNoteModel = getMessageSharedNoteModel();
    const pollModel = getMessagePollModel();
    const meetingModel = getMessageMeetingModel();
    const botModel = getMessageThreadBotModel();
    const integrationModel = getMessageThreadIntegrationModel();
    const webhookModel = getMessageThreadWebhookModel();

    const [
      activeCall,
      followedRecord,
      threadAttachments,
      rawSpaceTasks,
      sharedNotes,
      polls,
      meetings,
      bots,
      integrations,
      webhooks,
      guestInvites,
      globalNotificationPreference,
      threadNotificationPreference,
    ] = await Promise.all([
      getActiveThreadCall(options.threadId),
      db.messageThreadFollow.findUnique({
        where: {
          messageThreadId_userId: {
            messageThreadId: options.threadId,
            userId: options.context.userId,
          }
        },
        select: { id: true }
      }),
      db.messageAttachment.findMany({
        where: {
          message: {
            messageThreadId: options.threadId
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          createdByUser: {
            select: {
              name: true
            }
          },
          message: {
            select: {
              body: true
            }
          }
        }
      }),
      db.messageSpaceTask.findMany({
        where: {
          messageThreadId: options.threadId,
          archivedAt: null,
          status: { not: "CANCELLED" }
        },
        orderBy: { createdAt: "desc" },
        include: {
          assignedToUser: {
            select: { id: true, name: true, role: true, avatarUrl: true }
          },
          createdByUser: {
            select: { id: true, name: true, role: true, avatarUrl: true }
          },
          completedByUser: {
            select: { id: true, name: true, role: true, avatarUrl: true }
          },
          approvedByUser: {
            select: { id: true, name: true, role: true, avatarUrl: true }
          }
        }
      }),
      sharedNoteModel
        ? sharedNoteModel.findMany({
            where: {
              messageThreadId: options.threadId,
            },
            orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
              updatedByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          })
        : Promise.resolve([]),
      pollModel
        ? pollModel.findMany({
            where: {
              messageThreadId: options.threadId,
            },
            orderBy: { createdAt: "desc" },
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
              options: {
                orderBy: { position: "asc" },
                include: {
                  votes: {
                    include: {
                      user: {
                        select: { id: true, name: true, avatarUrl: true },
                      },
                    },
                  },
                },
              },
              votes: {
                select: { id: true },
              },
            },
          })
        : Promise.resolve([]),
      meetingModel
        ? meetingModel.findMany({
            where: {
              messageThreadId: options.threadId,
            },
            orderBy: { startsAt: "asc" },
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          })
        : Promise.resolve([]),
      botModel
        ? botModel.findMany({
            where: { messageThreadId: options.threadId },
            orderBy: { createdAt: "desc" },
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          })
        : Promise.resolve([]),
      integrationModel
        ? integrationModel.findMany({
            where: { messageThreadId: options.threadId },
            orderBy: { createdAt: "desc" },
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          })
        : Promise.resolve([]),
      webhookModel
        ? webhookModel.findMany({
            where: { messageThreadId: options.threadId },
            orderBy: { createdAt: "desc" },
            include: {
              createdByUser: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          })
        : Promise.resolve([]),
      db.messageThreadGuestInvite.findMany({
        where: {
          messageThreadId: options.threadId,
          revokedAt: null,
        },
        orderBy: { invitedAt: "desc" },
      }),
      userNotificationPreferenceModel
        ? userNotificationPreferenceModel.findUnique({
            where: { userId: options.context.userId },
            select: {
              notifyOnMentions: true,
              notifyOnKeywords: true,
              keywordList: true,
              dndEnabled: true,
              dndStartMinutes: true,
              dndEndMinutes: true,
            },
          })
        : Promise.resolve(null),
      threadNotificationPreferenceModel
        ? threadNotificationPreferenceModel.findUnique({
            where: {
              messageThreadId_userId: {
                messageThreadId: options.threadId,
                userId: options.context.userId,
              },
            },
            select: {
              level: true,
              mutedUntil: true,
              snoozedUntil: true,
              customKeywords: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const attachmentVersionModel = getMessageAttachmentVersionModel();
    const attachmentVersions =
      attachmentVersionModel && threadAttachments.length > 0
        ? await attachmentVersionModel.findMany({
            where: {
              messageAttachmentId: {
                in: threadAttachments.map((attachment) => attachment.id),
              },
            },
            orderBy: [{ messageAttachmentId: "asc" }, { versionNumber: "desc" }],
          })
        : [];
    const versionsByAttachmentId = new Map<string, MessageAttachmentVersionRecord[]>();
    attachmentVersions.forEach((version) => {
      const group = versionsByAttachmentId.get(version.messageAttachmentId) ?? [];
      group.push(version);
      versionsByAttachmentId.set(version.messageAttachmentId, group);
    });

    const members = thread.participants.map((participant) => ({
      id: participant.user.id,
      name: participant.user.name,
      avatarUrl: participant.user.avatarUrl ?? null,
      membershipRole: participant.role,
      roleKey: participant.user.role,
      roleName: formatRoleLabel(participant.user.role),
      isOnline: participant.user.presence?.status === "ONLINE"
    }));

    const isNamedChannel =
      thread.threadType === "GENERAL" &&
      !thread.workOrderId &&
      Boolean(thread.title);

    const mentionableUserRecords = isNamedChannel
      ? await db.user.findMany({
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            presence: {
              select: {
                status: true,
              },
            },
          },
          orderBy: { name: "asc" },
        })
      : thread.participants.map((participant) => participant.user);

    const mentionableUsers = mentionableUserRecords.map((user) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      roleKey: user.role,
      roleName: formatRoleLabel(user.role),
      isOnline: user.presence?.status === "ONLINE",
      userType: user.role ?? "USER",
    }));

    const timeline = threadMessages.map((message) => ({
      ...message,
      isUnread: false,
      isSaved: message.savedByUsers.length > 0,
      createdByUser: message.createdByUser
        ? {
            id: message.createdByUser.id,
            name: message.createdByUser.name,
            email: message.createdByUser.email,
            avatarUrl: message.createdByUser.avatarUrl ?? null,
            isOnline: message.createdByUser.presence?.status === "ONLINE",
          }
        : null,
      quotedMessage: message.quotedMessage
        ? {
            ...message.quotedMessage,
            createdByUser: message.quotedMessage.createdByUser
              ? {
                  id: message.quotedMessage.createdByUser.id,
                  name: message.quotedMessage.createdByUser.name,
                  email: message.quotedMessage.createdByUser.email,
                  avatarUrl: message.quotedMessage.createdByUser.avatarUrl ?? null,
                  isOnline: message.quotedMessage.createdByUser.presence?.status === "ONLINE",
                }
              : null,
          }
        : null,
      mentions: message.mentions.map((mention) => ({
        ...mention,
        mentionedUser: mention.mentionedUser
          ? {
              id: mention.mentionedUser.id,
              name: mention.mentionedUser.name,
              email: mention.mentionedUser.email,
              avatarUrl: mention.mentionedUser.avatarUrl ?? null,
            }
          : null,
      })),
      attachments: message.attachments.map((attachment) => ({
        ...attachment,
        mediaAssetId: null,
        isImage:
          attachment.mimeType?.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
      })),
    }));

    const spaceTasks = rawSpaceTasks.map((task) => ({
      ...task,
      assignedToUser: {
        id: task.assignedToUser.id,
        name: task.assignedToUser.name,
        avatarUrl: task.assignedToUser.avatarUrl ?? null,
      },
      createdByUser: task.createdByUser
        ? {
            id: task.createdByUser.id,
            name: task.createdByUser.name,
            avatarUrl: task.createdByUser.avatarUrl ?? null,
          }
        : null,
      completedByUser: task.completedByUser
        ? {
            id: task.completedByUser.id,
            name: task.completedByUser.name,
            avatarUrl: task.completedByUser.avatarUrl ?? null,
          }
        : null,
      approvedByUser: task.approvedByUser
        ? {
            id: task.approvedByUser.id,
            name: task.approvedByUser.name,
            avatarUrl: task.approvedByUser.avatarUrl ?? null,
          }
        : null,
    }));

    const pinnedCount = timeline.filter((message) => message.isPinned).length;
    const savedCount = timeline.filter((message) => message.isSaved).length;
    const aiSummary = buildCatchupSummary({
      threadTitle: thread.title,
      workOrderNumber: thread.workOrder?.workOrderNumber,
      messages: timeline,
      spaceTasks,
      pinnedCount,
    });

    return {
      thread,
      displayName: thread.title || 'Direct Message',
      isDirectMessage: !thread.workOrderId && !thread.title,
      participantCount: thread.participants.length,
      primaryParticipant: members[0] ?? null,
      followedByCurrentUser: Boolean(followedRecord),
      pinnedCount,
      savedCount,
      activeCall,
      messages: timeline,
      participants: thread.participants || [],
      timeline,
      mentionableUsers,
      threadAttachments: threadAttachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        isImage:
          attachment.mimeType?.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
        createdAt: attachment.createdAt,
        messageBody: attachment.message?.body ?? null,
        versionCount: Math.max(versionsByAttachmentId.get(attachment.id)?.length ?? 0, 1),
        versions: (versionsByAttachmentId.get(attachment.id) ?? []).map((version) => ({
          id: version.id,
          versionNumber: version.versionNumber,
          fileName: version.fileName,
          mimeType: version.mimeType,
          sizeBytes: version.sizeBytes,
          createdAt: version.createdAt,
        })),
        createdByUser: attachment.createdByUser
          ? {
              name: attachment.createdByUser.name
            }
          : null,
      })),
      notificationPreferences: {
        global: {
          notifyOnMentions: globalNotificationPreference?.notifyOnMentions ?? true,
          notifyOnKeywords: globalNotificationPreference?.notifyOnKeywords ?? true,
          keywordList: globalNotificationPreference?.keywordList ?? null,
          dndEnabled: globalNotificationPreference?.dndEnabled ?? false,
          dndStartMinutes: globalNotificationPreference?.dndStartMinutes ?? null,
          dndEndMinutes: globalNotificationPreference?.dndEndMinutes ?? null,
        },
        thread: {
          level: threadNotificationPreference?.level ?? "ALL",
          mutedUntil: threadNotificationPreference?.mutedUntil ?? null,
          snoozedUntil: threadNotificationPreference?.snoozedUntil ?? null,
          customKeywords: threadNotificationPreference?.customKeywords ?? null,
        },
      },
      sharedNotes: sharedNotes.map((note) => ({
        id: note.id,
        title: note.title,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        createdByUser: note.createdByUser,
        updatedByUser: note.updatedByUser,
      })),
      polls: polls.map((poll) => ({
        id: poll.id,
        question: poll.question,
        description: poll.description,
        allowsMultiple: poll.allowsMultiple,
        closesAt: poll.closesAt ?? null,
        createdAt: poll.createdAt,
        createdByUser: poll.createdByUser,
        options: poll.options.map((option) => ({
          id: option.id,
          label: option.label,
          position: option.position,
          votes: option.votes.map((vote) => ({
            id: vote.id,
            userId: vote.userId,
            createdAt: vote.createdAt,
            user: vote.user,
          })),
        })),
        totalVotes: poll.options.reduce((sum, option) => sum + option.votes.length, 0),
      })),
      meetings: meetings.map((meeting) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        location: meeting.location,
        meetingUrl: meeting.meetingUrl,
        status: meeting.status,
        createdAt: meeting.createdAt,
        createdByUser: meeting.createdByUser,
      })),
      bots: bots.map((bot) => ({
        id: bot.id,
        name: bot.name,
        botType: bot.botType,
        description: bot.description,
        prompt: bot.prompt,
        cadenceMinutes: bot.cadenceMinutes,
        enabled: bot.enabled,
        nextRunAt: bot.nextRunAt ?? null,
        lastRunAt: bot.lastRunAt ?? null,
        createdAt: bot.createdAt,
        createdByUser: bot.createdByUser,
      })),
      integrations: integrations.map((integration) => ({
        id: integration.id,
        integrationType: integration.integrationType,
        displayName: integration.displayName,
        workspaceUrl: integration.workspaceUrl,
        projectKey: integration.projectKey,
        configJson: integration.configJson,
        enabled: integration.enabled,
        createdAt: integration.createdAt,
        createdByUser: integration.createdByUser,
      })),
      webhooks: webhooks.map((webhook) => ({
        id: webhook.id,
        displayName: webhook.displayName,
        targetUrl: webhook.targetUrl,
        subscribedEvents: webhook.subscribedEvents,
        enabled: webhook.enabled,
        lastTriggeredAt: webhook.lastTriggeredAt ?? null,
        lastStatus: webhook.lastStatus,
        createdAt: webhook.createdAt,
        createdByUser: webhook.createdByUser,
      })),
      guestInvites: (guestInvites.length > 0 ? guestInvites : embeddedGuestInvites)
        .filter((guest) => !guest.expiresAt || guest.expiresAt > now)
        .map((guest) => ({
        id: guest.id,
        email: guest.email,
        name: guest.name,
        accessToken: guest.accessToken,
        invitedAt: guest.invitedAt,
        expiresAt: guest.expiresAt,
        acceptedAt: guest.acceptedAt,
      })),
      spaceTasks,
      members,
      availableComposeScopes: [
        "INTERNAL_ONLY",
        "CONTRACTOR_VISIBLE",
        "CLIENT_VISIBLE",
        "TASK_PARTICIPANTS_ONLY",
      ],
      aiSummary,
    };
  } catch (error) {
    console.error('Error fetching message thread workspace:', error);
    return null;
  }
}

export async function getMessagingInboxWorkspace(
  options: {
    context: MessagingAccessContext;
    view?: string;
    search?: string;
    filters?: {
      from?: string;
      saidIn?: string;
      startDate?: string;
      endDate?: string;
      hasFile?: string;
      hasLink?: boolean;
      mentionedMe?: boolean;
      onlyConversationsImIn?: boolean;
    };
  }
): Promise<{
  threads: any[];
  categories: any[];
  view: string;
  search: string;
  filters?: {
    from: string;
    saidIn: string;
    startDate: string;
    endDate: string;
    hasFile: string;
    hasLink: boolean;
    mentionedMe: boolean;
    onlyConversationsImIn: boolean;
  };
  totals: any;
  searchResults?: {
    messages: Array<{ id: string; body: string; createdAt: Date; threadId: string; threadLabel: string }>;
    files: Array<{ id: string; fileName: string; mimeType: string; createdAt: Date; threadId: string; threadLabel: string }>;
    users: Array<{ id: string; name: string; avatarUrl: string | null; role: string | null; threadId: string; threadLabel: string }>;
  };
}> {
  try {
    const { context, view = 'all', search = '', filters } = options;
    const now = new Date();
    const normalizedFilters = {
      from: filters?.from?.trim() ?? "",
      saidIn: filters?.saidIn?.trim() ?? "",
      startDate: filters?.startDate?.trim() ?? "",
      endDate: filters?.endDate?.trim() ?? "",
      hasFile: filters?.hasFile?.trim() ?? "",
      hasLink: Boolean(filters?.hasLink),
      mentionedMe: Boolean(filters?.mentionedMe),
      onlyConversationsImIn: Boolean(filters?.onlyConversationsImIn),
    };
    const startDate = normalizedFilters.startDate ? new Date(`${normalizedFilters.startDate}T00:00:00`) : null;
    const endDate = normalizedFilters.endDate ? new Date(`${normalizedFilters.endDate}T23:59:59.999`) : null;
    const hasValidStartDate = Boolean(startDate && !Number.isNaN(startDate.getTime()));
    const hasValidEndDate = Boolean(endDate && !Number.isNaN(endDate.getTime()));

    const attachmentMimeFilter = (() => {
      switch (normalizedFilters.hasFile) {
        case "documents":
          return ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
        case "spreadsheet":
          return ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
        case "presentation":
          return ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
        case "image":
          return ["image/"];
        case "pdf":
          return ["application/pdf"];
        case "video":
          return ["video/"];
        case "any":
          return ["*"];
        default:
          return [];
      }
    })();

    const threads = await db.messageThread.findMany({
      where: {
        OR: normalizedFilters.onlyConversationsImIn
          ? [
              {
                participants: {
                  some: {
                    userId: context.userId
                  }
                },
              },
            ]
          : [
              {
                participants: {
                  some: {
                    userId: context.userId
                  }
                },
              },
              {
                threadType: "GENERAL",
                workOrderId: null,
                NOT: { title: null },
              },
            ],
        ...(search && {
          OR: [
            { workOrder: { title: { contains: search } } },
            { messages: { some: { body: { contains: search } } } },
            { title: { contains: search } },
            {
              participants: {
                some: {
                  user: {
                    name: { contains: search },
                  },
                },
              },
            },
          ]
        })
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                presence: { select: { status: true, lastActiveAt: true } }
              }
            }
          }
        },
        workOrder: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });

    // Build proper thread objects with required fields
    const threadObjects = (threads as any).map((thread: any) => {
      const isDM = !thread.workOrderId && !thread.title;

      // For DMs, the primary participant is the OTHER user (not the current user)
      // For channels/WO threads, it's just the first participant
      const otherParticipants = thread.participants.filter(
        (p: any) => p.userId !== context.userId
      );
      const rawPrimary = isDM
        ? (otherParticipants[0] ?? thread.participants[0])
        : thread.participants[0];

      const primaryParticipant = rawPrimary?.user
        ? {
            id: rawPrimary.user.id,
            name: rawPrimary.user.name,
            email: rawPrimary.user.email,
            avatarUrl: rawPrimary.user.avatarUrl ?? null,
            isOnline: rawPrimary.user.presence?.status === 'ONLINE',
          }
        : null;

      const liveLatestMessage =
        (thread.messages || []).find((message: { expiresAt?: Date | null }) => !message.expiresAt || message.expiresAt > now) ?? null;

      return {
        ...thread,
        isDirectMessage: isDM,
        // For DMs use the other person's name; for channels use the title
        displayName: isDM
          ? (primaryParticipant?.name ?? 'Direct Message')
          : (thread.title ?? 'Thread'),
        workspaceKey: thread.workspaceKey ?? (thread.workOrderId ? "work-orders" : isDM ? "direct-messages" : "channels"),
        workspaceLabel: thread.workspaceLabel ?? (thread.workOrderId ? "Work Orders" : isDM ? "Direct Messages" : "Channels"),
        primaryParticipant,
        participantCount: thread.participants.length,
        latestMessage: liveLatestMessage,
        unreadCount: 0,
        channelImageUrl: thread.channelImageUrl ?? null,
        followedByCurrentUser: false,
        pinnedCount: 0,
        savedCount: 0,
        activeCall: null,
      };
    });

    const categories = [
      { key: 'all', label: 'All', count: threadObjects.length },
      ...Array.from(new Map(threadObjects.map((thread: any) => [thread.workspaceKey, thread.workspaceLabel])).entries()).map(([key, label]) => ({
        key,
        label,
        count: threadObjects.filter((thread: any) => thread.workspaceKey === key).length,
      })),
      { key: 'mentions', label: 'Mentions', count: 0 },
      { key: 'unread', label: 'Unread', count: 0 },
      { key: 'needs-response', label: 'Needs Response', count: 0 },
    ];

    const threadIds = threadObjects.map((thread: { id: string }) => thread.id);
    const threadLabels = new Map(
      threadObjects.map((thread: { id: string; displayName: string; title: string | null }) => [
        thread.id,
        thread.displayName ?? thread.title ?? "Thread",
      ])
    );

    const [messageResults, fileResults, userResults] = search.trim()
      ? await Promise.all([
          db.workOrderMessage.findMany({
            where: {
              messageThreadId: { in: threadIds },
              body: { contains: search },
              ...(normalizedFilters.from
                ? {
                    createdByUser: {
                      name: { contains: normalizedFilters.from },
                    },
                  }
                : {}),
              ...(normalizedFilters.saidIn
                ? {
                    messageThread: {
                      title: { contains: normalizedFilters.saidIn },
                    },
                  }
                : {}),
              ...(hasValidStartDate || hasValidEndDate
                ? {
                    createdAt: {
                      ...(hasValidStartDate ? { gte: startDate as Date } : {}),
                      ...(hasValidEndDate ? { lte: endDate as Date } : {}),
                    },
                  }
                : {}),
              ...(normalizedFilters.hasLink
                ? {
                    OR: [
                      { body: { contains: "http://" } },
                      { body: { contains: "https://" } },
                      { body: { contains: "www." } },
                    ],
                  }
                : {}),
              ...(normalizedFilters.mentionedMe
                ? {
                    mentions: {
                      some: {
                        mentionedUserId: context.userId,
                      },
                    },
                  }
                : {}),
            },
            select: {
              id: true,
              body: true,
              createdAt: true,
              messageThreadId: true,
            },
            orderBy: { createdAt: "desc" },
            take: 8,
          }),
          db.messageAttachment.findMany({
            where: {
              message: {
                messageThreadId: { in: threadIds },
                ...(normalizedFilters.from
                  ? {
                      createdByUser: {
                        name: { contains: normalizedFilters.from },
                      },
                    }
                  : {}),
                ...(normalizedFilters.saidIn
                  ? {
                      messageThread: {
                        title: { contains: normalizedFilters.saidIn },
                      },
                    }
                  : {}),
                ...(hasValidStartDate || hasValidEndDate
                  ? {
                      createdAt: {
                        ...(hasValidStartDate ? { gte: startDate as Date } : {}),
                        ...(hasValidEndDate ? { lte: endDate as Date } : {}),
                      },
                    }
                  : {}),
                ...(normalizedFilters.hasLink
                  ? {
                      OR: [
                        { body: { contains: "http://" } },
                        { body: { contains: "https://" } },
                        { body: { contains: "www." } },
                      ],
                    }
                  : {}),
                ...(normalizedFilters.mentionedMe
                  ? {
                      mentions: {
                        some: {
                          mentionedUserId: context.userId,
                        },
                      },
                    }
                  : {}),
              },
              ...(attachmentMimeFilter.length > 0
                ? attachmentMimeFilter[0] === "*"
                  ? {}
                  : {
                      OR: attachmentMimeFilter.map((mime) =>
                        mime.endsWith("/")
                          ? { mimeType: { startsWith: mime } }
                          : { mimeType: { equals: mime } }
                      ),
                    }
                : {}),
              ...(normalizedFilters.hasFile === "any" || normalizedFilters.hasFile
                ? {}
                : { fileName: { contains: search } }),
              ...(normalizedFilters.hasFile === ""
                ? { fileName: { contains: search } }
                : {}),
            },
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              createdAt: true,
              message: { select: { messageThreadId: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 8,
          }),
          db.user.findMany({
            where: {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
              messageThreadMemberships: {
                some: {
                  messageThreadId: { in: threadIds },
                  ...(normalizedFilters.onlyConversationsImIn ? { userId: context.userId } : {}),
                },
              },
            },
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
              messageThreadMemberships: {
                where: {
                  messageThreadId: { in: threadIds },
                },
                select: { messageThreadId: true },
                take: 1,
              },
            },
            take: 8,
          }),
        ])
      : [[], [], []];

    const filteredThreads =
      view === "all" || view === "mentions" || view === "unread" || view === "needs-response"
        ? threadObjects
        : threadObjects.filter((thread: any) => thread.workspaceKey === view);

    return {
      threads: filteredThreads,
      categories,
      view,
      search,
      filters: normalizedFilters,
      totals: {
        all: threadObjects.length,
        unread: 0,
        pinned: 0
      },
      searchResults: {
        messages: messageResults.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          threadId: message.messageThreadId,
          threadLabel: threadLabels.get(message.messageThreadId) ?? "Thread",
        })),
        files: fileResults.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          createdAt: file.createdAt,
          threadId: file.message.messageThreadId,
          threadLabel: threadLabels.get(file.message.messageThreadId) ?? "Thread",
        })),
        users: userResults
          .map((user) => {
            const threadId = user.messageThreadMemberships[0]?.messageThreadId;
            if (!threadId) {
              return null;
            }
            return {
              id: user.id,
              name: user.name,
              avatarUrl: user.avatarUrl ?? null,
              role: user.role ?? null,
              threadId,
              threadLabel: threadLabels.get(threadId) ?? "Thread",
            };
          })
          .filter((user): user is { id: string; name: string; avatarUrl: string | null; role: string | null; threadId: string; threadLabel: string } => Boolean(user)),
      },
    };
  } catch (error) {
    console.error('Error fetching messaging inbox workspace:', error);
    return {
      threads: [],
      categories: [
        { key: 'all', label: 'All', count: 0 },
        { key: 'mentions', label: 'Mentions', count: 0 },
        { key: 'unread', label: 'Unread', count: 0 },
        { key: 'needs-response', label: 'Needs Response', count: 0 },
      ],
      view: 'all',
      search: '',
      filters: {
        from: "",
        saidIn: "",
        startDate: "",
        endDate: "",
        hasFile: "",
        hasLink: false,
        mentionedMe: false,
        onlyConversationsImIn: false,
      },
      totals: { all: 0, unread: 0, pinned: 0 },
      searchResults: {
        messages: [],
        files: [],
        users: [],
      },
    };
  }
}

export async function getMessageTemplateManagerWorkspace(
  _context: MessagingAccessContext,
  _filters?: Record<string, unknown>
): Promise<any> {
  return {
    templates: [],
    categories: [],
    totals: { all: 0, archived: 0 },
    filters: {}
  };
}

export async function getMessagingEscalationWorkspaceWithFilters(
  _context: MessagingAccessContext,
  _filters?: Record<string, unknown>
): Promise<any> {
  return {
    escalations: [],
    owners: [],
    filters: {},
    totals: { open: 0, overdue: 0, unowned: 0 }
  };
}

export async function getMessagingNotificationSummary(
  _context: MessagingAccessContext
): Promise<any> {
  return {
    unreadCount: 0,
    unreadNotifications: [],
    categories: []
  };
}
