import type { MessageThreadNotificationLevel } from "@/generated/prisma";

export type GlobalNotificationPreference = {
  notifyOnMentions: boolean;
  notifyOnKeywords: boolean;
  keywordList: string | null;
  dndEnabled: boolean;
  dndStartMinutes: number | null;
  dndEndMinutes: number | null;
};

export type ThreadNotificationPreference = {
  level: MessageThreadNotificationLevel;
  mutedUntil: Date | string | null;
  snoozedUntil: Date | string | null;
  customKeywords: string | null;
};

export function parseKeywordList(input: string | null | undefined) {
  return Array.from(
    new Set(
      (input ?? "")
        .split(/[\n,]/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function matchesKeyword(body: string, keywords: string[]) {
  const normalizedBody = body.toLowerCase();
  return keywords.some((keyword) => normalizedBody.includes(keyword));
}

export function isNowInDnd(
  preference: Pick<GlobalNotificationPreference, "dndEnabled" | "dndStartMinutes" | "dndEndMinutes"> | null | undefined,
  now = new Date()
) {
  if (!preference?.dndEnabled) {
    return false;
  }

  const start = preference.dndStartMinutes;
  const end = preference.dndEndMinutes;
  if (start === null || start === undefined || end === null || end === undefined) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (start === end) {
    return true;
  }

  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }

  return currentMinutes >= start || currentMinutes < end;
}

export function isThreadNotificationsPaused(
  preference: Pick<ThreadNotificationPreference, "level" | "mutedUntil" | "snoozedUntil"> | null | undefined,
  now = new Date()
) {
  if (!preference) {
    return false;
  }

  if (preference.level === "MUTED") {
    return true;
  }

  const mutedUntil = preference.mutedUntil ? new Date(preference.mutedUntil) : null;
  const snoozedUntil = preference.snoozedUntil ? new Date(preference.snoozedUntil) : null;

  return Boolean((mutedUntil && mutedUntil > now) || (snoozedUntil && snoozedUntil > now));
}

export function buildEffectiveKeywords(
  globalPreference: Pick<GlobalNotificationPreference, "keywordList"> | null | undefined,
  threadPreference: Pick<ThreadNotificationPreference, "customKeywords"> | null | undefined
) {
  return Array.from(
    new Set([
      ...parseKeywordList(globalPreference?.keywordList),
      ...parseKeywordList(threadPreference?.customKeywords),
    ])
  );
}
