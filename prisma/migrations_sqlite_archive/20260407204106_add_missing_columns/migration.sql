-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;

-- CreateTable
CREATE TABLE "MessageRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_presences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "activeThreadId" TEXT,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_presences_activeThreadId_fkey" FOREIGN KEY ("activeThreadId") REFERENCES "message_threads" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadType" TEXT NOT NULL,
    "title" TEXT,
    "channelImageUrl" TEXT,
    "workOrderId" TEXT,
    "createdByUserId" TEXT,
    "lastMessageAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_threads_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_threads_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_call_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "endedByUserId" TEXT,
    "roomName" TEXT NOT NULL,
    "title" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'VIDEO',
    "status" TEXT NOT NULL DEFAULT 'RINGING',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_call_sessions_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_call_sessions_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_call_sessions_endedByUserId_fkey" FOREIGN KEY ("endedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_call_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageCallSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "micEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cameraEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_call_participants_messageCallSessionId_fkey" FOREIGN KEY ("messageCallSessionId") REFERENCES "message_call_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_call_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_thread_participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_thread_participants_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_thread_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_thread_participants_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_order_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "quotedMessageId" TEXT,
    "workOrderId" TEXT,
    "visibilityScope" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'COMMENT',
    "authorType" TEXT NOT NULL DEFAULT 'USER',
    "urgency" TEXT NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "systemEventKey" TEXT,
    "requiresResponse" BOOLEAN NOT NULL DEFAULT false,
    "responseDueAt" DATETIME,
    "assignedResponderId" TEXT,
    "resolvedAt" DATETIME,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "work_order_messages_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_order_messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "work_order_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "work_order_messages_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "work_order_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "work_order_messages_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "work_order_messages_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "work_order_messages_assignedResponderId_fkey" FOREIGN KEY ("assignedResponderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_space_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToUserId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "completedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "dueAt" DATETIME,
    "completedAt" DATETIME,
    "approvedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_space_tasks_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "work_order_messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_space_tasks_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_thread_follows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_thread_follows_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_thread_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "saved_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "work_order_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'DIRECT_UPLOAD',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "work_order_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_attachments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_mentions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "mentionedUserId" TEXT,
    "mentionedRoleKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_mentions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "work_order_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "visibilityScope" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'COMMENT',
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" DATETIME,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "message_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_escalations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "escalatedByUserId" TEXT,
    "escalatedToUserId" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'HIGH',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "targetResponseAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "resolvedByUserId" TEXT,
    CONSTRAINT "message_escalations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "work_order_messages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_escalations_escalatedByUserId_fkey" FOREIGN KEY ("escalatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_escalations_escalatedToUserId_fkey" FOREIGN KEY ("escalatedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_escalations_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_escalation_comments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "escalationId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_escalation_comments_escalationId_fkey" FOREIGN KEY ("escalationId") REFERENCES "message_escalations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_escalation_comments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_thread_blocks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageThreadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_thread_blocks_messageThreadId_fkey" FOREIGN KEY ("messageThreadId") REFERENCES "message_threads" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "message_thread_blocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "messageId" TEXT,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MessageRead_userId_readAt_idx" ON "MessageRead"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_presences_userId_key" ON "user_presences"("userId");

-- CreateIndex
CREATE INDEX "user_presences_status_lastActiveAt_idx" ON "user_presences"("status", "lastActiveAt");

-- CreateIndex
CREATE INDEX "message_threads_threadType_lastMessageAt_idx" ON "message_threads"("threadType", "lastMessageAt");

-- CreateIndex
CREATE INDEX "message_threads_workOrderId_idx" ON "message_threads"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "message_call_sessions_roomName_key" ON "message_call_sessions"("roomName");

-- CreateIndex
CREATE INDEX "message_call_sessions_messageThreadId_status_startedAt_idx" ON "message_call_sessions"("messageThreadId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "message_call_sessions_createdByUserId_startedAt_idx" ON "message_call_sessions"("createdByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "message_call_participants_userId_lastSeenAt_idx" ON "message_call_participants"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "message_call_participants_messageCallSessionId_leftAt_idx" ON "message_call_participants"("messageCallSessionId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_call_participants_messageCallSessionId_userId_key" ON "message_call_participants"("messageCallSessionId", "userId");

-- CreateIndex
CREATE INDEX "message_thread_participants_userId_createdAt_idx" ON "message_thread_participants"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_participants_messageThreadId_userId_key" ON "message_thread_participants"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "work_order_messages_messageThreadId_createdAt_idx" ON "work_order_messages"("messageThreadId", "createdAt");

-- CreateIndex
CREATE INDEX "work_order_messages_visibilityScope_createdAt_idx" ON "work_order_messages"("visibilityScope", "createdAt");

-- CreateIndex
CREATE INDEX "work_order_messages_workOrderId_idx" ON "work_order_messages"("workOrderId");

-- CreateIndex
CREATE INDEX "work_order_messages_requiresResponse_responseDueAt_idx" ON "work_order_messages"("requiresResponse", "responseDueAt");

-- CreateIndex
CREATE INDEX "work_order_messages_assignedResponderId_idx" ON "work_order_messages"("assignedResponderId");

-- CreateIndex
CREATE INDEX "message_space_tasks_messageThreadId_status_idx" ON "message_space_tasks"("messageThreadId", "status");

-- CreateIndex
CREATE INDEX "message_space_tasks_assignedToUserId_status_idx" ON "message_space_tasks"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "message_space_tasks_workOrderId_status_idx" ON "message_space_tasks"("workOrderId", "status");

-- CreateIndex
CREATE INDEX "message_thread_follows_userId_createdAt_idx" ON "message_thread_follows"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_follows_messageThreadId_userId_key" ON "message_thread_follows"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "saved_messages_userId_createdAt_idx" ON "saved_messages"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_messages_messageId_userId_key" ON "saved_messages"("messageId", "userId");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE INDEX "message_mentions_messageId_idx" ON "message_mentions"("messageId");

-- CreateIndex
CREATE INDEX "message_mentions_mentionedUserId_idx" ON "message_mentions"("mentionedUserId");

-- CreateIndex
CREATE INDEX "message_templates_category_visibilityScope_isActive_idx" ON "message_templates"("category", "visibilityScope", "isActive");

-- CreateIndex
CREATE INDEX "message_escalations_messageId_status_idx" ON "message_escalations"("messageId", "status");

-- CreateIndex
CREATE INDEX "message_escalations_escalatedToUserId_status_idx" ON "message_escalations"("escalatedToUserId", "status");

-- CreateIndex
CREATE INDEX "message_escalation_comments_escalationId_createdAt_idx" ON "message_escalation_comments"("escalationId", "createdAt");

-- CreateIndex
CREATE INDEX "message_thread_blocks_userId_createdAt_idx" ON "message_thread_blocks"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_thread_blocks_messageThreadId_userId_key" ON "message_thread_blocks"("messageThreadId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
