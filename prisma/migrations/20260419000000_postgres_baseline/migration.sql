-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CLIENT', 'CONTRACTOR', 'COORDINATOR', 'PROCESSOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('GRASS_CUT', 'DEBRIS_REMOVAL', 'WINTERIZATION', 'BOARD_UP', 'INSPECTION', 'MOLD_REMEDIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."WorkOrderStatus" AS ENUM ('NEW', 'UNASSIGNED', 'IN_PROGRESS', 'ASSIGNED', 'READ', 'COMPLETED', 'FIELD_COMPLETE', 'OFFICE_APPROVED', 'SENT_TO_CLIENT', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."FileCategory" AS ENUM ('PHOTO_BEFORE', 'PHOTO_DURING', 'PHOTO_AFTER', 'PHOTO_BID', 'PHOTO_INSPECTION', 'DOCUMENT_PDF', 'DOCUMENT_PCR', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('MESSAGE');

-- CreateEnum
CREATE TYPE "public"."MessageThreadNotificationLevel" AS ENUM ('ALL', 'MENTIONS_ONLY', 'MUTED');

-- CreateEnum
CREATE TYPE "public"."MessageSpaceTaskStatus" AS ENUM ('OPEN', 'DONE', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MessageVisibilityScope" AS ENUM ('INTERNAL_ONLY', 'CONTRACTOR_VISIBLE', 'CLIENT_VISIBLE', 'SYSTEM_ONLY', 'TASK_PARTICIPANTS_ONLY');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('COMMENT', 'SYSTEM_EVENT', 'REVISION_REQUEST', 'CLIENT_UPDATE', 'ASSIGNMENT_NOTE', 'QC_FEEDBACK', 'BID_UPDATE', 'INSPECTION_UPDATE', 'ACCOUNTING_NOTE');

-- CreateEnum
CREATE TYPE "public"."MessageAuthorType" AS ENUM ('USER', 'SYSTEM', 'CONTRACTOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "public"."MessageUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."MessageThreadType" AS ENUM ('WORK_ORDER', 'TASK', 'SERVICE_ITEM', 'BID', 'INSPECTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."MessageAttachmentSourceType" AS ENUM ('DIRECT_UPLOAD', 'EXISTING_MEDIA');

-- CreateEnum
CREATE TYPE "public"."MessageTemplateCategory" AS ENUM ('GENERAL', 'REVISION_REQUEST', 'CLIENT_UPDATE', 'ASSIGNMENT_NOTE', 'QC_FEEDBACK', 'ACCOUNTING_NOTE');

-- CreateEnum
CREATE TYPE "public"."MessageEscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."MessageCallMode" AS ENUM ('AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "public"."MessageCallStatus" AS ENUM ('RINGING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "public"."UserPresenceStatus" AS ENUM ('ONLINE', 'AWAY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "public"."MessageMeetingStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."MessageBotType" AS ENUM ('REMINDER', 'WORKFLOW', 'AI_ASSISTANT');

-- CreateEnum
CREATE TYPE "public"."MessageIntegrationType" AS ENUM ('GITHUB', 'JIRA', 'NOTION', 'GENERIC');

-- CreateEnum
CREATE TYPE "public"."MessageWebhookEvent" AS ENUM ('MESSAGE_CREATED', 'TASK_CREATED', 'TASK_UPDATED', 'NOTE_UPDATED', 'POLL_CREATED', 'MEETING_CREATED');

-- CreateEnum
CREATE TYPE "public"."MessageThreadParticipantRole" AS ENUM ('ADMIN', 'MEMBER', 'GUEST');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "address" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "serviceType" "public"."ServiceType" NOT NULL,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "dueDate" TIMESTAMP(3),
    "tasks" TEXT,
    "workOrderNumber" TEXT,
    "coordinator" TEXT,
    "processor" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLon" DOUBLE PRECISION,
    "lockCode" TEXT,
    "lockLocation" TEXT,
    "keyCode" TEXT,
    "gateCode" TEXT,
    "lotSize" TEXT,
    "assignedDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "estCompletion" TIMESTAMP(3),
    "fieldComplete" TIMESTAMP(3),
    "contractorName" TEXT,
    "contractorEmail" TEXT,
    "contractorPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "assignedContractorId" TEXT,
    "assignedCoordinatorId" TEXT,
    "assignedProcessorId" TEXT,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "taskId" TEXT,
    "bidId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageRead" (
    "id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_presences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."UserPresenceStatus" NOT NULL DEFAULT 'ONLINE',
    "activeThreadId" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_threads" (
    "id" TEXT NOT NULL,
    "threadType" "public"."MessageThreadType" NOT NULL,
    "title" TEXT,
    "channelImageUrl" TEXT,
    "workspaceKey" TEXT,
    "workspaceLabel" TEXT,
    "workOrderId" TEXT,
    "createdByUserId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_call_sessions" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "endedByUserId" TEXT,
    "roomName" TEXT NOT NULL,
    "title" TEXT,
    "mode" "public"."MessageCallMode" NOT NULL DEFAULT 'VIDEO',
    "status" "public"."MessageCallStatus" NOT NULL DEFAULT 'RINGING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_call_participants" (
    "id" TEXT NOT NULL,
    "messageCallSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "micEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cameraEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_call_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_participants" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MessageThreadParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_order_messages" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "quotedMessageId" TEXT,
    "workOrderId" TEXT,
    "visibilityScope" "public"."MessageVisibilityScope" NOT NULL,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'COMMENT',
    "authorType" "public"."MessageAuthorType" NOT NULL DEFAULT 'USER',
    "urgency" "public"."MessageUrgency" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "systemEventKey" TEXT,
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "responseDueAt" TIMESTAMP(3),
    "assignedResponderId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_guest_invites" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "accessToken" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "message_thread_guest_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_translations" (
    "id" TEXT NOT NULL,
    "workOrderMessageId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "translatedBody" TEXT NOT NULL,
    "provider" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_space_tasks" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToUserId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "completedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "status" "public"."MessageSpaceTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_space_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_follows" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_thread_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyOnMentions" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnKeywords" BOOLEAN NOT NULL DEFAULT true,
    "keywordList" TEXT,
    "dndEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dndStartMinutes" INTEGER,
    "dndEndMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_notification_preferences" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "public"."MessageThreadNotificationLevel" NOT NULL DEFAULT 'ALL',
    "mutedUntil" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "customKeywords" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_thread_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_shared_notes" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_shared_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_polls" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "allowsMultiple" BOOLEAN NOT NULL DEFAULT false,
    "closesAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_poll_options" (
    "id" TEXT NOT NULL,
    "messagePollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_poll_votes" (
    "id" TEXT NOT NULL,
    "messagePollId" TEXT NOT NULL,
    "messagePollOptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_meetings" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "meetingUrl" TEXT,
    "status" "public"."MessageMeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_bots" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "botType" "public"."MessageBotType" NOT NULL,
    "description" TEXT,
    "prompt" TEXT,
    "cadenceMinutes" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_thread_bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_integrations" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "integrationType" "public"."MessageIntegrationType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "workspaceUrl" TEXT,
    "projectKey" TEXT,
    "configJson" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_thread_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_webhooks" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secret" TEXT,
    "subscribedEvents" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_thread_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_messages" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sourceType" "public"."MessageAttachmentSourceType" NOT NULL DEFAULT 'DIRECT_UPLOAD',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_attachment_versions" (
    "id" TEXT NOT NULL,
    "messageAttachmentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_mentions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "mentionedUserId" TEXT,
    "mentionedRoleKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."MessageTemplateCategory" NOT NULL DEFAULT 'GENERAL',
    "visibilityScope" "public"."MessageVisibilityScope" NOT NULL,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'COMMENT',
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_escalations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "escalatedByUserId" TEXT,
    "escalatedToUserId" TEXT,
    "urgency" "public"."MessageUrgency" NOT NULL DEFAULT 'HIGH',
    "reason" TEXT NOT NULL,
    "status" "public"."MessageEscalationStatus" NOT NULL DEFAULT 'OPEN',
    "targetResponseAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,

    CONSTRAINT "message_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_escalation_comments" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_escalation_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_thread_blocks" (
    "id" TEXT NOT NULL,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_thread_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "public"."SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "closedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_ticket_comments" (
    "id" TEXT NOT NULL,
    "supportTicketId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "messageId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FileAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "public"."FileCategory" NOT NULL,
    "taskId" TEXT,
    "requirementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workOrderId" TEXT NOT NULL,

    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "sentToClientDate" TIMESTAMP(3),
    "completeDate" TIMESTAMP(3),
    "noCharge" BOOLEAN NOT NULL DEFAULT false,
    "clientTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "adjPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalTotal" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "flatFee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "MessageRead_userId_readAt_idx" ON "public"."MessageRead"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "public"."MessageRead"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_presences_userId_key" ON "public"."user_presences"("userId");

-- CreateIndex
CREATE INDEX "user_presences_status_lastActiveAt_idx" ON "public"."user_presences"("status", "lastActiveAt");

-- CreateIndex
CREATE INDEX "message_threads_threadType_lastMessageAt_idx" ON "public"."message_threads"("threadType", "lastMessageAt");

-- CreateIndex
CREATE INDEX "message_threads_workspaceKey_updatedAt_idx" ON "public"."message_threads"("workspaceKey", "updatedAt");

-- CreateIndex
CREATE INDEX "message_threads_workOrderId_idx" ON "public"."message_threads"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_call_sessions_roomName_key" ON "public"."message_call_sessions"("roomName");

-- CreateIndex
CREATE INDEX "message_call_sessions_messageThreadId_status_startedAt_idx" ON "public"."message_call_sessions"("messageThreadId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "message_call_sessions_createdByUserId_startedAt_idx" ON "public"."message_call_sessions"("createdByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "message_call_participants_userId_lastSeenAt_idx" ON "public"."message_call_participants"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "message_call_participants_messageCallSessionId_leftAt_idx" ON "public"."message_call_participants"("messageCallSessionId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_call_participants_messageCallSessionId_userId_key" ON "public"."message_call_participants"("messageCallSessionId", "userId");

-- CreateIndex
CREATE INDEX "message_thread_participants_userId_createdAt_idx" ON "public"."message_thread_participants"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_participants_messageThreadId_userId_key" ON "public"."message_thread_participants"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "work_order_messages_messageThreadId_createdAt_idx" ON "public"."work_order_messages"("messageThreadId", "createdAt");

-- CreateIndex
CREATE INDEX "work_order_messages_expiresAt_idx" ON "public"."work_order_messages"("expiresAt");

-- CreateIndex
CREATE INDEX "work_order_messages_visibilityScope_createdAt_idx" ON "public"."work_order_messages"("visibilityScope", "createdAt");

-- CreateIndex
CREATE INDEX "work_order_messages_workOrderId_idx" ON "public"."work_order_messages"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_messages_requiresResponse_responseDueAt_idx" ON "public"."work_order_messages"("requiresResponse", "responseDueAt");

-- CreateIndex
CREATE INDEX "work_order_messages_assignedResponderId_idx" ON "public"."work_order_messages"("assignedResponderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_guest_invites_accessToken_key" ON "public"."message_thread_guest_invites"("accessToken");

-- CreateIndex
CREATE INDEX "message_thread_guest_invites_messageThreadId_invitedAt_idx" ON "public"."message_thread_guest_invites"("messageThreadId", "invitedAt");

-- CreateIndex
CREATE INDEX "message_thread_guest_invites_email_revokedAt_idx" ON "public"."message_thread_guest_invites"("email", "revokedAt");

-- CreateIndex
CREATE INDEX "message_translations_targetLanguage_createdAt_idx" ON "public"."message_translations"("targetLanguage", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_translations_workOrderMessageId_targetLanguage_key" ON "public"."message_translations"("workOrderMessageId", "targetLanguage");

-- CreateIndex
CREATE INDEX "message_space_tasks_messageThreadId_status_idx" ON "public"."message_space_tasks"("messageThreadId", "status");

-- CreateIndex
CREATE INDEX "message_space_tasks_assignedToUserId_status_idx" ON "public"."message_space_tasks"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "message_space_tasks_workOrderId_status_idx" ON "public"."message_space_tasks"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "message_thread_follows_userId_createdAt_idx" ON "public"."message_thread_follows"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_follows_messageThreadId_userId_key" ON "public"."message_thread_follows"("messageThreadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_userId_key" ON "public"."user_notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "message_thread_notification_preferences_userId_updatedAt_idx" ON "public"."message_thread_notification_preferences"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_notification_preferences_messageThreadId_use_key" ON "public"."message_thread_notification_preferences"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "message_shared_notes_messageThreadId_updatedAt_idx" ON "public"."message_shared_notes"("messageThreadId", "updatedAt");

-- CreateIndex
CREATE INDEX "message_polls_messageThreadId_createdAt_idx" ON "public"."message_polls"("messageThreadId", "createdAt");

-- CreateIndex
CREATE INDEX "message_poll_options_messagePollId_position_idx" ON "public"."message_poll_options"("messagePollId", "position");

-- CreateIndex
CREATE INDEX "message_poll_votes_userId_createdAt_idx" ON "public"."message_poll_votes"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_poll_votes_messagePollId_messagePollOptionId_userId_key" ON "public"."message_poll_votes"("messagePollId", "messagePollOptionId", "userId");

-- CreateIndex
CREATE INDEX "message_meetings_messageThreadId_startsAt_idx" ON "public"."message_meetings"("messageThreadId", "startsAt");

-- CreateIndex
CREATE INDEX "message_thread_bots_messageThreadId_enabled_idx" ON "public"."message_thread_bots"("messageThreadId", "enabled");

-- CreateIndex
CREATE INDEX "message_thread_integrations_messageThreadId_integrationType_idx" ON "public"."message_thread_integrations"("messageThreadId", "integrationType");

-- CreateIndex
CREATE INDEX "message_thread_webhooks_messageThreadId_enabled_idx" ON "public"."message_thread_webhooks"("messageThreadId", "enabled");

-- CreateIndex
CREATE INDEX "saved_messages_userId_createdAt_idx" ON "public"."saved_messages"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_messages_messageId_userId_key" ON "public"."saved_messages"("messageId", "userId");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "public"."message_attachments"("messageId");

-- CreateIndex
CREATE INDEX "message_attachment_versions_messageAttachmentId_createdAt_idx" ON "public"."message_attachment_versions"("messageAttachmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_attachment_versions_messageAttachmentId_versionNumb_key" ON "public"."message_attachment_versions"("messageAttachmentId", "versionNumber");

-- CreateIndex
CREATE INDEX "message_mentions_messageId_idx" ON "public"."message_mentions"("messageId");

-- CreateIndex
CREATE INDEX "message_mentions_mentionedUserId_idx" ON "public"."message_mentions"("mentionedUserId");

-- CreateIndex
CREATE INDEX "message_templates_category_visibilityScope_isActive_idx" ON "public"."message_templates"("category", "visibilityScope", "isActive");

-- CreateIndex
CREATE INDEX "message_escalations_messageId_status_idx" ON "public"."message_escalations"("messageId", "status");

-- CreateIndex
CREATE INDEX "message_escalations_escalatedToUserId_status_idx" ON "public"."message_escalations"("escalatedToUserId", "status");

-- CreateIndex
CREATE INDEX "message_escalation_comments_escalationId_createdAt_idx" ON "public"."message_escalation_comments"("escalationId", "createdAt");

-- CreateIndex
CREATE INDEX "message_thread_blocks_userId_createdAt_idx" ON "public"."message_thread_blocks"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_blocks_messageThreadId_userId_key" ON "public"."message_thread_blocks"("messageThreadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticketNumber_key" ON "public"."support_tickets"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_createdByUserId_status_updatedAt_idx" ON "public"."support_tickets"("createdByUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "support_tickets_assignedToUserId_status_updatedAt_idx" ON "public"."support_tickets"("assignedToUserId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_updatedAt_idx" ON "public"."support_tickets"("status", "priority", "updatedAt");

-- CreateIndex
CREATE INDEX "support_ticket_comments_supportTicketId_createdAt_idx" ON "public"."support_ticket_comments"("supportTicketId", "createdAt");

-- CreateIndex
CREATE INDEX "support_ticket_comments_createdByUserId_createdAt_idx" ON "public"."support_ticket_comments"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "public"."Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileAttachment_key_key" ON "public"."FileAttachment"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_workOrderId_key" ON "public"."Invoice"("workOrderId");

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_assignedContractorId_fkey" FOREIGN KEY ("assignedContractorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_assignedCoordinatorId_fkey" FOREIGN KEY ("assignedCoordinatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_assignedProcessorId_fkey" FOREIGN KEY ("assignedProcessorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_presences" ADD CONSTRAINT "user_presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_presences" ADD CONSTRAINT "user_presences_activeThreadId_fkey" FOREIGN KEY ("activeThreadId") REFERENCES "public"."message_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_threads" ADD CONSTRAINT "message_threads_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_threads" ADD CONSTRAINT "message_threads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_call_sessions" ADD CONSTRAINT "message_call_sessions_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_call_sessions" ADD CONSTRAINT "message_call_sessions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_call_sessions" ADD CONSTRAINT "message_call_sessions_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_call_participants" ADD CONSTRAINT "message_call_participants_messageCallSessionId_fkey" FOREIGN KEY ("messageCallSessionId") REFERENCES "public"."message_call_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_call_participants" ADD CONSTRAINT "message_call_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_participants" ADD CONSTRAINT "message_thread_participants_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_participants" ADD CONSTRAINT "message_thread_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_participants" ADD CONSTRAINT "message_thread_participants_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "public"."work_order_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "public"."work_order_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_order_messages" ADD CONSTRAINT "work_order_messages_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_guest_invites" ADD CONSTRAINT "message_thread_guest_invites_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_guest_invites" ADD CONSTRAINT "message_thread_guest_invites_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_translations" ADD CONSTRAINT "message_translations_workOrderMessageId_fkey" FOREIGN KEY ("workOrderMessageId") REFERENCES "public"."work_order_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_translations" ADD CONSTRAINT "message_translations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."work_order_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_space_tasks" ADD CONSTRAINT "message_space_tasks_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_follows" ADD CONSTRAINT "message_thread_follows_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_follows" ADD CONSTRAINT "message_thread_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_notification_preferences" ADD CONSTRAINT "message_thread_notification_preferences_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_notification_preferences" ADD CONSTRAINT "message_thread_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_shared_notes" ADD CONSTRAINT "message_shared_notes_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_shared_notes" ADD CONSTRAINT "message_shared_notes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_shared_notes" ADD CONSTRAINT "message_shared_notes_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_polls" ADD CONSTRAINT "message_polls_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_polls" ADD CONSTRAINT "message_polls_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_poll_options" ADD CONSTRAINT "message_poll_options_messagePollId_fkey" FOREIGN KEY ("messagePollId") REFERENCES "public"."message_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_poll_votes" ADD CONSTRAINT "message_poll_votes_messagePollId_fkey" FOREIGN KEY ("messagePollId") REFERENCES "public"."message_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_poll_votes" ADD CONSTRAINT "message_poll_votes_messagePollOptionId_fkey" FOREIGN KEY ("messagePollOptionId") REFERENCES "public"."message_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_poll_votes" ADD CONSTRAINT "message_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_meetings" ADD CONSTRAINT "message_meetings_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_meetings" ADD CONSTRAINT "message_meetings_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_bots" ADD CONSTRAINT "message_thread_bots_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_bots" ADD CONSTRAINT "message_thread_bots_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_integrations" ADD CONSTRAINT "message_thread_integrations_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_integrations" ADD CONSTRAINT "message_thread_integrations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_webhooks" ADD CONSTRAINT "message_thread_webhooks_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_webhooks" ADD CONSTRAINT "message_thread_webhooks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_messages" ADD CONSTRAINT "saved_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."work_order_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_messages" ADD CONSTRAINT "saved_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."work_order_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_attachments" ADD CONSTRAINT "message_attachments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_attachment_versions" ADD CONSTRAINT "message_attachment_versions_messageAttachmentId_fkey" FOREIGN KEY ("messageAttachmentId") REFERENCES "public"."message_attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_attachment_versions" ADD CONSTRAINT "message_attachment_versions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_mentions" ADD CONSTRAINT "message_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."work_order_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_mentions" ADD CONSTRAINT "message_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_templates" ADD CONSTRAINT "message_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalations" ADD CONSTRAINT "message_escalations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."work_order_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalations" ADD CONSTRAINT "message_escalations_escalatedByUserId_fkey" FOREIGN KEY ("escalatedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalations" ADD CONSTRAINT "message_escalations_escalatedToUserId_fkey" FOREIGN KEY ("escalatedToUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalations" ADD CONSTRAINT "message_escalations_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalation_comments" ADD CONSTRAINT "message_escalation_comments_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "public"."message_escalations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_escalation_comments" ADD CONSTRAINT "message_escalation_comments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_blocks" ADD CONSTRAINT "message_thread_blocks_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_thread_blocks" ADD CONSTRAINT "message_thread_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_tickets" ADD CONSTRAINT "support_tickets_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_ticket_comments" ADD CONSTRAINT "support_ticket_comments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FileAttachment" ADD CONSTRAINT "FileAttachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

