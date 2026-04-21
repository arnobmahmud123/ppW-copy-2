import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import {
  canAccessMessageThread,
  canComposeInThread,
  canManageThread,
  getMessageThreadWorkspace,
  getMessagingAccessContext,
} from "@/modules/messaging";
import { MessageType, MessageVisibilityScope } from "@/generated/prisma";
import { createMessageNotifications } from "@/modules/messaging/message-notifications";
import { dispatchThreadWebhookEvent } from "@/modules/messaging/thread-webhooks";
import { encryptString } from "@/lib/security";
import fs from "fs";
import path from "path";

/** Save a file under public/uploads/messages/ and return the attachment metadata. */
async function saveMessageFile(
  file: File
): Promise<{
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  blobData: Buffer;
}> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const dir = path.join(process.cwd(), "public", "uploads", "messages");
  const safe = (file.name || `file-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
  } catch (error) {
    console.warn("Message attachment fell back to database storage.", error);
  }
  return {
    fileName: file.name || filename,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storageKey: `uploads/messages/${filename}`,
    blobData: buffer,
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

function serializeThreadWorkspacePayload(workspace: any) {
  return {
    thread: {
      id: workspace.thread.id,
      title: workspace.thread.title,
      channelImageUrl: workspace.thread.channelImageUrl ?? null,
      workspaceKey: workspace.thread.workspaceKey ?? null,
      workspaceLabel: workspace.thread.workspaceLabel ?? null,
      threadType: workspace.thread.threadType,
      displayName: workspace.displayName,
      isDirectMessage: workspace.isDirectMessage,
      participantCount: workspace.participantCount,
      primaryParticipant: workspace.primaryParticipant
        ? {
            id: workspace.primaryParticipant.id,
            name: workspace.primaryParticipant.name,
            avatarUrl: workspace.primaryParticipant.avatarUrl ?? null,
            isOnline: workspace.primaryParticipant.isOnline,
          }
        : null,
      followedByCurrentUser: workspace.followedByCurrentUser,
      pinnedCount: workspace.pinnedCount,
      savedCount: workspace.savedCount,
      workOrderId: workspace.thread.workOrderId,
      workOrder: workspace.thread.workOrder
        ? {
            id: workspace.thread.workOrder.id,
            workOrderNumber: workspace.thread.workOrder.workOrderNumber,
            status: workspace.thread.workOrder.status,
            dueDate: workspace.thread.workOrder.dueDate?.toISOString() ?? null,
            property: {
              addressLine1: workspace.thread.workOrder.addressLine1,
              city: workspace.thread.workOrder.city,
              state: workspace.thread.workOrder.state,
              postalCode: workspace.thread.workOrder.postalCode,
            },
            client: {
              name: workspace.thread.workOrder.client?.name ?? "Unknown client",
            },
            assignments: [],
            services: [],
          }
        : null,
    },
    activeCall: workspace.activeCall
      ? {
          id: workspace.activeCall.id,
          roomName: workspace.activeCall.roomName,
          title: workspace.activeCall.title,
          mode: workspace.activeCall.mode,
          status: workspace.activeCall.status,
          startedAt: workspace.activeCall.startedAt instanceof Date ? workspace.activeCall.startedAt.toISOString() : workspace.activeCall.startedAt,
          endedAt:
            workspace.activeCall.endedAt instanceof Date
              ? workspace.activeCall.endedAt.toISOString()
              : workspace.activeCall.endedAt ?? null,
          createdByUser: workspace.activeCall.createdByUser
            ? {
                id: workspace.activeCall.createdByUser.id,
                name: workspace.activeCall.createdByUser.name,
                avatarUrl: workspace.activeCall.createdByUser.avatarUrl ?? null,
              }
            : null,
          participants: (workspace.activeCall.participants || []).map((participant: any) => ({
            id: participant.id,
            userId: participant.userId,
            name: participant.name,
            avatarUrl: participant.avatarUrl ?? null,
            joinedAt: participant.joinedAt instanceof Date ? participant.joinedAt.toISOString() : participant.joinedAt,
            leftAt: participant.leftAt instanceof Date ? participant.leftAt.toISOString() : participant.leftAt ?? null,
            lastSeenAt:
              participant.lastSeenAt instanceof Date ? participant.lastSeenAt.toISOString() : participant.lastSeenAt,
            micEnabled: participant.micEnabled,
            cameraEnabled: participant.cameraEnabled,
          })),
        }
      : null,
    members: workspace.members || [],
    
    timeline: (workspace.timeline || []).map((item: any) => ({
      id: item.id,
      threadId: item.messageThreadId ?? item.threadId,
      parentMessageId: item.parentMessageId,
      visibilityScope: item.visibilityScope,
      messageType: item.messageType,
      authorType: item.authorType,
      subject: item.subject,
      body: item.body,
      expiresAt: item.expiresAt instanceof Date ? item.expiresAt.toISOString() : item.expiresAt ?? null,
      isUnread: item.isUnread ?? false,
      isPinned: item.isPinned ?? false,
      isSaved: item.isSaved ?? false,
      requiresResponse: item.requiresResponse ?? false,
      resolvedAt: item.resolvedAt instanceof Date ? item.resolvedAt.toISOString() : item.resolvedAt ?? null,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
      createdByUser: item.createdByUser
        ? {
            id: item.createdByUser.id,
            name: item.createdByUser.name,
            avatarUrl: item.createdByUser.avatarUrl ?? null,
            isOnline: item.createdByUser.isOnline ?? false,
          }
        : null,
      mentions: (item.mentions || []).map((mention: any) => ({
        id: mention.id,
        mentionedUserId: mention.mentionedUserId,
        mentionedRoleKey: mention.mentionedRoleKey,
        mentionedUser: mention.mentionedUser
          ? {
              id: mention.mentionedUser.id,
              name: mention.mentionedUser.name,
              avatarUrl: mention.mentionedUser.avatarUrl ?? null,
            }
          : null,
      })),
      quotedMessageId: item.quotedMessageId ?? null,
      quotedMessage: item.quotedMessage
        ? {
            id: item.quotedMessage.id,
            body: item.quotedMessage.body,
            createdByUser: item.quotedMessage.createdByUser
              ? {
                  id: item.quotedMessage.createdByUser.id,
                  name: item.quotedMessage.createdByUser.name,
                  avatarUrl: item.quotedMessage.createdByUser.avatarUrl ?? null,
                }
              : null,
          }
        : null,
      attachments: (item.attachments || []).map((attachment: any) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        mediaAssetId: attachment.mediaAssetId ?? null,
        isImage: attachment.isImage ?? false,
      })),
    })),
    mentionableUsers: (workspace.mentionableUsers || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      userType: user.userType,
      roleKey: user.roleKey,
      roleName: user.roleName,
      isOnline: user.isOnline,
    })),
    threadAttachments: (workspace.threadAttachments || []).map((attachment: any) => ({
      ...attachment,
      createdAt: attachment.createdAt instanceof Date ? attachment.createdAt.toISOString() : attachment.createdAt,
      versions: (attachment.versions || []).map((version: any) => ({
        ...version,
        createdAt: version.createdAt instanceof Date ? version.createdAt.toISOString() : version.createdAt,
      })),
    })),
    notificationPreferences: {
      global: {
        notifyOnMentions: workspace.notificationPreferences?.global?.notifyOnMentions ?? true,
        notifyOnKeywords: workspace.notificationPreferences?.global?.notifyOnKeywords ?? true,
        keywordList: workspace.notificationPreferences?.global?.keywordList ?? null,
        dndEnabled: workspace.notificationPreferences?.global?.dndEnabled ?? false,
        dndStartMinutes: workspace.notificationPreferences?.global?.dndStartMinutes ?? null,
        dndEndMinutes: workspace.notificationPreferences?.global?.dndEndMinutes ?? null,
      },
      thread: {
        level: workspace.notificationPreferences?.thread?.level ?? "ALL",
        mutedUntil:
          workspace.notificationPreferences?.thread?.mutedUntil instanceof Date
            ? workspace.notificationPreferences.thread.mutedUntil.toISOString()
            : workspace.notificationPreferences?.thread?.mutedUntil ?? null,
        snoozedUntil:
          workspace.notificationPreferences?.thread?.snoozedUntil instanceof Date
            ? workspace.notificationPreferences.thread.snoozedUntil.toISOString()
            : workspace.notificationPreferences?.thread?.snoozedUntil ?? null,
        customKeywords: workspace.notificationPreferences?.thread?.customKeywords ?? null,
      },
    },
    sharedNotes: (workspace.sharedNotes || []).map((note: any) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
      updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
      createdByUser: note.createdByUser
        ? {
            id: note.createdByUser.id,
            name: note.createdByUser.name,
            avatarUrl: note.createdByUser.avatarUrl ?? null,
          }
        : null,
      updatedByUser: note.updatedByUser
        ? {
            id: note.updatedByUser.id,
            name: note.updatedByUser.name,
            avatarUrl: note.updatedByUser.avatarUrl ?? null,
          }
        : null,
    })),
    polls: (workspace.polls || []).map((poll: any) => ({
      id: poll.id,
      question: poll.question,
      description: poll.description ?? null,
      allowsMultiple: Boolean(poll.allowsMultiple),
      closesAt: poll.closesAt instanceof Date ? poll.closesAt.toISOString() : poll.closesAt ?? null,
      createdAt: poll.createdAt instanceof Date ? poll.createdAt.toISOString() : poll.createdAt,
      createdByUser: poll.createdByUser
        ? {
            id: poll.createdByUser.id,
            name: poll.createdByUser.name,
            avatarUrl: poll.createdByUser.avatarUrl ?? null,
          }
        : null,
      totalVotes: poll.totalVotes ?? 0,
      options: (poll.options || []).map((option: any) => ({
        id: option.id,
        label: option.label,
        position: option.position ?? 0,
        votes: (option.votes || []).map((vote: any) => ({
          id: vote.id,
          userId: vote.userId,
          createdAt: vote.createdAt instanceof Date ? vote.createdAt.toISOString() : vote.createdAt,
          user: vote.user
            ? {
                id: vote.user.id,
                name: vote.user.name,
                avatarUrl: vote.user.avatarUrl ?? null,
              }
            : null,
        })),
      })),
    })),
    meetings: (workspace.meetings || []).map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title,
      description: meeting.description ?? null,
      startsAt: meeting.startsAt instanceof Date ? meeting.startsAt.toISOString() : meeting.startsAt,
      endsAt: meeting.endsAt instanceof Date ? meeting.endsAt.toISOString() : meeting.endsAt,
      location: meeting.location ?? null,
      meetingUrl: meeting.meetingUrl ?? null,
      status: meeting.status,
      createdAt: meeting.createdAt instanceof Date ? meeting.createdAt.toISOString() : meeting.createdAt,
      createdByUser: meeting.createdByUser
        ? {
            id: meeting.createdByUser.id,
            name: meeting.createdByUser.name,
            avatarUrl: meeting.createdByUser.avatarUrl ?? null,
          }
        : null,
    })),
    bots: (workspace.bots || []).map((bot: any) => ({
      id: bot.id,
      name: bot.name,
      botType: bot.botType,
      description: bot.description ?? null,
      prompt: bot.prompt ?? null,
      cadenceMinutes: bot.cadenceMinutes ?? null,
      enabled: Boolean(bot.enabled),
      nextRunAt: bot.nextRunAt instanceof Date ? bot.nextRunAt.toISOString() : bot.nextRunAt ?? null,
      lastRunAt: bot.lastRunAt instanceof Date ? bot.lastRunAt.toISOString() : bot.lastRunAt ?? null,
      createdAt: bot.createdAt instanceof Date ? bot.createdAt.toISOString() : bot.createdAt,
      createdByUser: bot.createdByUser
        ? {
            id: bot.createdByUser.id,
            name: bot.createdByUser.name,
            avatarUrl: bot.createdByUser.avatarUrl ?? null,
          }
        : null,
    })),
    integrations: (workspace.integrations || []).map((integration: any) => ({
      id: integration.id,
      integrationType: integration.integrationType,
      displayName: integration.displayName,
      workspaceUrl: integration.workspaceUrl ?? null,
      projectKey: integration.projectKey ?? null,
      configJson: integration.configJson ?? null,
      enabled: Boolean(integration.enabled),
      createdAt: integration.createdAt instanceof Date ? integration.createdAt.toISOString() : integration.createdAt,
      createdByUser: integration.createdByUser
        ? {
            id: integration.createdByUser.id,
            name: integration.createdByUser.name,
            avatarUrl: integration.createdByUser.avatarUrl ?? null,
          }
        : null,
    })),
    webhooks: (workspace.webhooks || []).map((webhook: any) => ({
      id: webhook.id,
      displayName: webhook.displayName,
      targetUrl: webhook.targetUrl,
      subscribedEvents: webhook.subscribedEvents,
      enabled: Boolean(webhook.enabled),
      lastTriggeredAt:
        webhook.lastTriggeredAt instanceof Date ? webhook.lastTriggeredAt.toISOString() : webhook.lastTriggeredAt ?? null,
      lastStatus: webhook.lastStatus ?? null,
      createdAt: webhook.createdAt instanceof Date ? webhook.createdAt.toISOString() : webhook.createdAt,
      createdByUser: webhook.createdByUser
        ? {
            id: webhook.createdByUser.id,
            name: webhook.createdByUser.name,
            avatarUrl: webhook.createdByUser.avatarUrl ?? null,
          }
        : null,
    })),
    guestInvites: (workspace.guestInvites || []).map((guest: any) => ({
      id: guest.id,
      email: guest.email,
      name: guest.name ?? null,
      accessToken: guest.accessToken,
      invitedAt: guest.invitedAt instanceof Date ? guest.invitedAt.toISOString() : guest.invitedAt,
      expiresAt: guest.expiresAt instanceof Date ? guest.expiresAt.toISOString() : guest.expiresAt ?? null,
      acceptedAt: guest.acceptedAt instanceof Date ? guest.acceptedAt.toISOString() : guest.acceptedAt ?? null,
    })),
    aiSummary: workspace.aiSummary || [],
    spaceTasks: (workspace.spaceTasks || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueAt: task.dueAt instanceof Date ? task.dueAt.toISOString() : task.dueAt ?? null,
      assignedToUser: task.assignedToUser,
      createdByUser: task.createdByUser,
      completedByUser: task.completedByUser,
      approvedByUser: task.approvedByUser,
      completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : task.completedAt ?? null,
      approvedAt: task.approvedAt instanceof Date ? task.approvedAt.toISOString() : task.approvedAt ?? null,
      createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      updatedAt: task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
    })),
    availableComposeScopes: workspace.availableComposeScopes || [],
  };
}

function serializeMessageRecord(message: any) {
  return serializeThreadWorkspacePayload({
    thread: {
      id: "",
      title: null,
      channelImageUrl: null,
      threadType: "GENERAL",
      workOrderId: null,
      workOrder: null,
    },
    displayName: "",
    isDirectMessage: false,
    participantCount: 0,
    primaryParticipant: null,
    followedByCurrentUser: false,
    pinnedCount: 0,
    savedCount: 0,
    activeCall: null,
    members: [],
    mentionableUsers: [],
    threadAttachments: [],
    aiSummary: [],
    spaceTasks: [],
    availableComposeScopes: [],
    timeline: [message],
  }).timeline[0];
}

function serializeSpaceTaskRecord(task: any) {
  return serializeThreadWorkspacePayload({
    thread: {
      id: "",
      title: null,
      channelImageUrl: null,
      threadType: "GENERAL",
      workOrderId: null,
      workOrder: null,
    },
    displayName: "",
    isDirectMessage: false,
    participantCount: 0,
    primaryParticipant: null,
    followedByCurrentUser: false,
    pinnedCount: 0,
    savedCount: 0,
    activeCall: null,
    members: [],
    mentionableUsers: [],
    threadAttachments: [],
    aiSummary: [],
    timeline: [],
    availableComposeScopes: [],
    spaceTasks: [task],
  }).spaceTasks[0];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const workspace = await getMessageThreadWorkspace({ context, threadId: id });
  if (!workspace) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  return NextResponse.json(serializeThreadWorkspacePayload(workspace));
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
  const canCompose = await canComposeInThread(context, id);
  if (!canCompose) {
    return NextResponse.json({ error: "You do not have permission to send messages in this thread." }, { status: 403 });
  }

  const formData = await request.formData();
  const body = String(formData.get("body") ?? "").trim();
  const visibilityScope = String(formData.get("visibilityScope") ?? MessageVisibilityScope.INTERNAL_ONLY);
  const messageType = String(formData.get("messageType") ?? MessageType.COMMENT);
  const replyToMessageId = String(formData.get("replyToMessageId") ?? "").trim();
  const quotedMessageId = String(formData.get("quotedMessageId") ?? "").trim();
  const createSpaceTask = String(formData.get("createSpaceTask") ?? "") === "true";
  const expiresInHoursRaw = String(formData.get("expiresInHours") ?? "").trim();
  const spaceTaskTitle = String(formData.get("spaceTaskTitle") ?? "").trim();
  const spaceTaskDescription = String(formData.get("spaceTaskDescription") ?? "").trim();
  const spaceTaskAssigneeId = String(formData.get("spaceTaskAssigneeId") ?? "").trim();
  const spaceTaskDueAt = String(formData.get("spaceTaskDueAt") ?? "").trim();
  const mentionedUserIds = formData
    .getAll("mentionedUserIds")
    .map((value) => String(value))
    .filter(Boolean);
  const expiresInHours = expiresInHoursRaw ? Number(expiresInHoursRaw) : null;

  const directFiles = formData.getAll("directFiles").filter((f): f is File => f instanceof File && f.size > 0);

  if (!body && directFiles.length === 0) {
    return NextResponse.json({ error: "Message body or at least one file is required." }, { status: 400 });
  }

  if (createSpaceTask && (!spaceTaskTitle || !spaceTaskAssigneeId)) {
    return NextResponse.json({ error: "Task title and assignee are required." }, { status: 400 });
  }
  if (expiresInHours !== null && (!Number.isFinite(expiresInHours) || expiresInHours <= 0)) {
    return NextResponse.json({ error: "Expiry must be a positive number of hours." }, { status: 400 });
  }

  const thread = await db.messageThread.findUnique({
    where: { id },
    select: {
      id: true,
      workOrderId: true,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  // Upload any direct files first (outside the transaction so we don't hold it open during IO)
  const savedFiles: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    blobData: Buffer;
  }[] = [];
  for (const file of directFiles) {
    try {
      savedFiles.push(await saveMessageFile(file));
    } catch (err) {
      console.error("Failed to save message file:", err);
    }
  }

  if (directFiles.length > 0 && savedFiles.length === 0) {
    return NextResponse.json({ error: "Unable to upload the selected file(s)." }, { status: 500 });
  }

  // If body is empty but files are attached, use a neutral body
  const effectiveBody = body || (savedFiles.length > 0 ? "📎 " + savedFiles.map(f => f.fileName).join(", ") : "");

  try {
    const created = await db.$transaction(async (tx) => {
      const message = await tx.workOrderMessage.create({
        data: {
          messageThreadId: id,
          workOrderId: thread.workOrderId,
          createdByUserId: session.id,
          body: effectiveBody,
          expiresAt: expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : null,
          visibilityScope: (visibilityScope as MessageVisibilityScope) || MessageVisibilityScope.INTERNAL_ONLY,
          messageType: (messageType as MessageType) || MessageType.COMMENT,
          parentMessageId: replyToMessageId || null,
          quotedMessageId: quotedMessageId || null,
          mentions: mentionedUserIds.length
            ? {
                create: mentionedUserIds.map((mentionedUserId) => ({
                  mentionedUserId,
                })),
              }
            : undefined,
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              presence: {
                select: {
                  status: true,
                },
              },
            },
          },
          quotedMessage: {
            include: {
              createdByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  presence: {
                    select: {
                      status: true,
                    },
                  },
                },
              },
            },
          },
          mentions: {
            include: {
              mentionedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          attachments: true,
          savedByUsers: {
            where: { userId: session.id },
            select: { id: true },
          },
        },
      });

      let messageAttachments = message.attachments;

      if (savedFiles.length > 0) {
        const versionModel = getAttachmentVersionModelFromClient(tx);

        for (const file of savedFiles) {
          const createdAttachment = await tx.messageAttachment.create({
            data: {
              messageId: message.id,
              createdByUserId: session.id,
              fileName: file.fileName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              storageKey: file.storageKey,
              blobData: file.blobData,
            },
          });

          if (versionModel) {
            await versionModel.create({
              data: {
                messageAttachmentId: createdAttachment.id,
                versionNumber: 1,
                fileName: file.fileName,
                mimeType: file.mimeType,
                sizeBytes: file.sizeBytes,
                storageKey: file.storageKey,
                blobData: file.blobData,
                createdByUserId: session.id,
              },
            });
          }
        }

        messageAttachments = await tx.messageAttachment.findMany({
          where: { messageId: message.id },
          orderBy: { createdAt: "asc" },
        });
      }

      let task = null;
      if (createSpaceTask) {
        task = await tx.messageSpaceTask.create({
          data: {
            messageThreadId: id,
            workOrderId: thread.workOrderId,
            messageId: message.id,
            title: spaceTaskTitle,
            description: spaceTaskDescription || null,
            assignedToUserId: spaceTaskAssigneeId,
            createdByUserId: session.id,
            dueAt: spaceTaskDueAt ? new Date(spaceTaskDueAt) : null,
          },
          include: {
            assignedToUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
            createdByUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
            completedByUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
            approvedByUser: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        });
      }

      await tx.messageThread.update({
        where: { id },
        data: {
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        message: {
          ...message,
          attachments: messageAttachments,
        },
        task,
      };
    });

    const normalizedMessage = {
      ...created.message,
      threadId: created.message.messageThreadId,
      isUnread: false,
      isSaved: created.message.savedByUsers.length > 0,
      createdByUser: created.message.createdByUser
        ? {
            id: created.message.createdByUser.id,
            name: created.message.createdByUser.name,
            avatarUrl: created.message.createdByUser.avatarUrl ?? null,
            isOnline: created.message.createdByUser.presence?.status === "ONLINE",
          }
        : null,
      quotedMessage: created.message.quotedMessage
        ? {
            ...created.message.quotedMessage,
            createdByUser: created.message.quotedMessage.createdByUser
              ? {
                  id: created.message.quotedMessage.createdByUser.id,
                  name: created.message.quotedMessage.createdByUser.name,
                  avatarUrl: created.message.quotedMessage.createdByUser.avatarUrl ?? null,
                }
              : null,
          }
        : null,
      mentions: created.message.mentions.map((mention) => ({
        ...mention,
        mentionedUser: mention.mentionedUser
          ? {
              id: mention.mentionedUser.id,
              name: mention.mentionedUser.name,
              avatarUrl: mention.mentionedUser.avatarUrl ?? null,
            }
          : null,
      })),
      attachments: created.message.attachments.map((attachment) => ({
        ...attachment,
        mediaAssetId: null,
        isImage:
          attachment.mimeType?.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.fileName),
      })),
    };

    const normalizedTask = created.task
      ? {
          ...created.task,
          assignedToUser: {
            id: created.task.assignedToUser.id,
            name: created.task.assignedToUser.name,
            avatarUrl: created.task.assignedToUser.avatarUrl ?? null,
          },
          createdByUser: created.task.createdByUser
            ? {
                id: created.task.createdByUser.id,
                name: created.task.createdByUser.name,
                avatarUrl: created.task.createdByUser.avatarUrl ?? null,
              }
            : null,
          completedByUser: created.task.completedByUser
            ? {
                id: created.task.completedByUser.id,
                name: created.task.completedByUser.name,
                avatarUrl: created.task.completedByUser.avatarUrl ?? null,
              }
            : null,
          approvedByUser: created.task.approvedByUser
            ? {
                id: created.task.approvedByUser.id,
                name: created.task.approvedByUser.name,
                avatarUrl: created.task.approvedByUser.avatarUrl ?? null,
              }
            : null,
        }
      : null;

    await createMessageNotifications({
      threadId: id,
      messageId: created.message.id,
      senderUserId: session.id,
      body: effectiveBody,
      threadTitle: workspaceTitleFromMessage(created.message.subject, thread.title ?? null),
      mentionedUserIds,
      workOrderId: thread.workOrderId,
    });

    await dispatchThreadWebhookEvent({
      threadId: id,
      event: created.task ? "TASK_CREATED" : "MESSAGE_CREATED",
      payload: {
        messageId: created.message.id,
        body: effectiveBody,
        taskId: created.task?.id ?? null,
        createdByUserId: session.id,
      },
    });

    return NextResponse.json({
      message: serializeMessageRecord(normalizedMessage),
      spaceTask: normalizedTask ? serializeSpaceTaskRecord(normalizedTask) : null,
    });
  } catch (error) {
    console.error("Failed to create thread message", error);
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}

function workspaceTitleFromMessage(subject: string | null | undefined, threadTitle: string | null) {
  return threadTitle || subject || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Only thread admins can update channel security settings." }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    channelImageUrl?: string | null;
    avatarAssetId?: string | null;
    workspaceKey?: string | null;
    workspaceLabel?: string | null;
    notificationSettings?: {
      global?: {
        notifyOnMentions?: boolean;
        notifyOnKeywords?: boolean;
        keywordList?: string | null;
        dndEnabled?: boolean;
        dndStartMinutes?: number | null;
        dndEndMinutes?: number | null;
      };
      thread?: {
        level?: "ALL" | "MENTIONS_ONLY" | "MUTED";
        customKeywords?: string | null;
        mutedUntil?: string | null;
        snoozedUntil?: string | null;
      };
    };
  };
  const data: { title?: string; channelImageUrl?: string | null; workspaceKey?: string | null; workspaceLabel?: string | null } = {};

  if (typeof payload.title === "string" && payload.title.trim()) {
    data.title = payload.title.trim();
  }

  if (payload.channelImageUrl !== undefined) {
    data.channelImageUrl = payload.channelImageUrl;
  }
  
  if (payload.avatarAssetId !== undefined) {
    data.channelImageUrl = payload.avatarAssetId;
  }
  if (payload.workspaceKey !== undefined) {
    data.workspaceKey = payload.workspaceKey ? payload.workspaceKey.trim() : null;
  }
  if (payload.workspaceLabel !== undefined) {
    data.workspaceLabel = payload.workspaceLabel ? payload.workspaceLabel.trim() : null;
  }

  try {
    const updatedThread = await db.$transaction(async (tx) => {
      const threadRecord = await tx.messageThread.update({
        where: { id },
        data,
        select: {
          id: true,
          title: true,
          channelImageUrl: true,
        },
      });

      if (payload.notificationSettings?.global) {
        await tx.userNotificationPreference.upsert({
          where: { userId: session.id },
          update: {
            notifyOnMentions: payload.notificationSettings.global.notifyOnMentions ?? true,
            notifyOnKeywords: payload.notificationSettings.global.notifyOnKeywords ?? true,
            keywordList: payload.notificationSettings.global.keywordList ?? null,
            dndEnabled: payload.notificationSettings.global.dndEnabled ?? false,
            dndStartMinutes: payload.notificationSettings.global.dndStartMinutes ?? null,
            dndEndMinutes: payload.notificationSettings.global.dndEndMinutes ?? null,
          },
          create: {
            userId: session.id,
            notifyOnMentions: payload.notificationSettings.global.notifyOnMentions ?? true,
            notifyOnKeywords: payload.notificationSettings.global.notifyOnKeywords ?? true,
            keywordList: payload.notificationSettings.global.keywordList ?? null,
            dndEnabled: payload.notificationSettings.global.dndEnabled ?? false,
            dndStartMinutes: payload.notificationSettings.global.dndStartMinutes ?? null,
            dndEndMinutes: payload.notificationSettings.global.dndEndMinutes ?? null,
          },
        });
      }

      if (payload.notificationSettings?.thread) {
        await tx.messageThreadNotificationPreference.upsert({
          where: {
            messageThreadId_userId: {
              messageThreadId: id,
              userId: session.id,
            },
          },
          update: {
            level: payload.notificationSettings.thread.level ?? "ALL",
            customKeywords: payload.notificationSettings.thread.customKeywords ?? null,
            mutedUntil: payload.notificationSettings.thread.mutedUntil
              ? new Date(payload.notificationSettings.thread.mutedUntil)
              : null,
            snoozedUntil: payload.notificationSettings.thread.snoozedUntil
              ? new Date(payload.notificationSettings.thread.snoozedUntil)
              : null,
          },
          create: {
            messageThreadId: id,
            userId: session.id,
            level: payload.notificationSettings.thread.level ?? "ALL",
            customKeywords: payload.notificationSettings.thread.customKeywords ?? null,
            mutedUntil: payload.notificationSettings.thread.mutedUntil
              ? new Date(payload.notificationSettings.thread.mutedUntil)
              : null,
            snoozedUntil: payload.notificationSettings.thread.snoozedUntil
              ? new Date(payload.notificationSettings.thread.snoozedUntil)
              : null,
          },
        });
      }

      return threadRecord;
    });

    return NextResponse.json({ thread: updatedThread });
  } catch (error) {
    console.error("Failed to update thread", error);
    return NextResponse.json({ error: "Unable to update thread." }, { status: 500 });
  }
}
