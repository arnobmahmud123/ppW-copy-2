import { db } from "@/lib/db";
import {
  buildEffectiveKeywords,
  isNowInDnd,
  isThreadNotificationsPaused,
  matchesKeyword,
} from "@/modules/messaging/notification-settings";

type NotifyInput = {
  threadId: string;
  messageId: string;
  senderUserId: string;
  body: string;
  threadTitle: string | null;
  mentionedUserIds: string[];
  workOrderId?: string | null;
};

export async function createMessageNotifications(input: NotifyInput) {
  const participants = await db.messageThreadParticipant.findMany({
    where: {
      messageThreadId: input.threadId,
      userId: { not: input.senderUserId },
    },
    select: { userId: true },
  });

  if (participants.length === 0) {
    return;
  }

  const recipientIds = participants.map((participant) => participant.userId);
  const [globalPrefs, threadPrefs] = await Promise.all([
    db.userNotificationPreference.findMany({
      where: { userId: { in: recipientIds } },
      select: {
        userId: true,
        notifyOnMentions: true,
        notifyOnKeywords: true,
        keywordList: true,
        dndEnabled: true,
        dndStartMinutes: true,
        dndEndMinutes: true,
      },
    }),
    db.messageThreadNotificationPreference.findMany({
      where: {
        messageThreadId: input.threadId,
        userId: { in: recipientIds },
      },
      select: {
        userId: true,
        level: true,
        mutedUntil: true,
        snoozedUntil: true,
        customKeywords: true,
      },
    }),
  ]);

  const globalByUserId = new Map(globalPrefs.map((preference) => [preference.userId, preference]));
  const threadByUserId = new Map(threadPrefs.map((preference) => [preference.userId, preference]));
  const now = new Date();
  const notificationsToCreate = recipientIds.flatMap((userId) => {
    const globalPreference = globalByUserId.get(userId);
    const threadPreference = threadByUserId.get(userId);

    if (isNowInDnd(globalPreference, now) || isThreadNotificationsPaused(threadPreference, now)) {
      return [];
    }

    const isMention = input.mentionedUserIds.includes(userId) && (globalPreference?.notifyOnMentions ?? true);
    const matchedKeyword =
      (globalPreference?.notifyOnKeywords ?? true)
        ? matchesKeyword(input.body, buildEffectiveKeywords(globalPreference, threadPreference))
        : false;

    const level = threadPreference?.level ?? "ALL";
    const shouldNotify =
      level === "ALL"
        ? Boolean(input.body.trim())
        : isMention || matchedKeyword;

    if (!shouldNotify) {
      return [];
    }

    let title = input.threadTitle ? `New message in ${input.threadTitle}` : "New message";
    if (isMention && (globalPreference?.notifyOnMentions ?? true)) {
      title = input.threadTitle ? `Mentioned you in ${input.threadTitle}` : "Mentioned you";
    } else if (matchedKeyword) {
      title = input.threadTitle ? `Keyword alert in ${input.threadTitle}` : "Keyword alert";
    }

    return [
      {
        userId,
        type: "MESSAGE" as const,
        title,
        body: input.body.slice(0, 180) || "Attachment shared",
        link: `/messages?thread=${input.threadId}`,
        workOrderId: input.workOrderId ?? null,
      },
    ];
  });

  if (notificationsToCreate.length === 0) {
    return;
  }

  await db.notification.createMany({
    data: notificationsToCreate,
  });
}
