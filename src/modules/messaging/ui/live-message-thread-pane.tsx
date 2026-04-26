"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorkOrderStatus } from "@/generated/prisma";
import {
  AtSign,
  Bold,
  Check,
  CheckSquare,
  ClipboardList,
  CircleDot,
  FolderOpen,
  FileText,
  UserPlus,
  UserMinus,
  PhoneCall,
  PhoneOff,
  Video,
  Link2,
  ListChecks,
  MessageCircle,
  MessageCircleReply,
  MoreVertical,
  Forward,
  Paperclip,
  Pencil,
  Pin,
  Quote,
  SendHorizontal,
  SmilePlus,
  Sparkles,
  Star,
  UserCircle2,
  LogOut,
  X,
  Settings,
  CalendarDays,
  Clock3,
  ChevronDown,
  MapPin,
  Mic,
  BarChart3,
  Plus,
  Bot,
  PlugZap,
  Webhook,
  Trash2,
  ShieldAlert,
  Search,
  UserX,
  Pause,
  Play,
} from "lucide-react";
import { deleteMessageThreadAction, blockMessageThreadAction, blockUserAction } from "@/app/messages/actions";
import PhotoEditorModal from "@/components/PhotoEditorModal";
import { MessageCallModal } from "@/modules/messaging/ui/message-call-modal";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserHoverCard } from "@/components/ui/user-hover-card";
import { cn } from "@/lib/utils";

type SessionInfo = {
  id: string;
  name: string;
  avatarUrl: string | null;
  userType: string;
  roles: string[];
};

type ThreadMessage = {
  id: string;
  threadId: string;
  parentMessageId: string | null;
  visibilityScope: string;
  messageType: string;
  authorType: string;
  subject: string | null;
  body: string;
  expiresAt?: string | null;
  isUnread: boolean;
  isPinned: boolean;
  isSaved: boolean;
  requiresResponse: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
    isOnline: boolean;
  } | null;
  mentions: Array<{
    id: string;
    mentionedUserId: string | null;
    mentionedRoleKey: string | null;
    mentionedUser: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
  }>;
  quotedMessageId?: string | null;
  quotedMessage?: {
    id: string;
    body: string;
    createdByUser: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
  } | null;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    mediaAssetId: string | null;
    isImage: boolean;
  }>;
};

type MentionableUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  userType: string;
  roleKey: string | null;
  roleName: string | null;
  isOnline: boolean;
};

type MentionSuggestion = MentionableUser & {
  special?: "all";
};

type CloudAttachmentDraft = {
  id: string;
  provider: "Google Drive" | "Dropbox" | "OneDrive";
  url: string;
};

type QueuedThreadMessageDraft = {
  id: string;
  threadId: string;
  parentMessageId: string | null;
  body: string;
  cloudAttachments: CloudAttachmentDraft[];
  mentionIds: string[];
  quotedMessageId: string | null;
  createTask: boolean;
  spaceTaskTitle: string;
  spaceTaskDescription: string;
  spaceTaskAssigneeId: string;
  spaceTaskDueAt: string;
  createdAt: string;
};

type MessageReactionMap = Record<string, string[]>;

type SpaceTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueAt: string | null;
  assignedToUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  completedByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  approvedByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  completedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SharedNote = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  updatedByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

type PollOption = {
  id: string;
  label: string;
  position: number;
  votes: Array<{
    id: string;
    userId: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
  }>;
};

type ThreadPoll = {
  id: string;
  question: string;
  description: string | null;
  allowsMultiple: boolean;
  closesAt: string | null;
  createdAt: string;
  totalVotes: number;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  options: PollOption[];
};

type ThreadMeeting = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  meetingUrl: string | null;
  status: string;
  createdAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

type ThreadBot = {
  id: string;
  name: string;
  botType: "REMINDER" | "WORKFLOW" | "AI_ASSISTANT" | string;
  description: string | null;
  prompt: string | null;
  cadenceMinutes: number | null;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

type ThreadIntegration = {
  id: string;
  integrationType: "GITHUB" | "JIRA" | "NOTION" | "GENERIC" | string;
  displayName: string;
  workspaceUrl: string | null;
  projectKey: string | null;
  configJson: string | null;
  enabled: boolean;
  createdAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

type ThreadWebhook = {
  id: string;
  displayName: string;
  targetUrl: string;
  subscribedEvents: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  lastStatus: string | null;
  createdAt: string;
  createdByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
};

type AiActionItem = {
  id: string;
  title: string;
  owner: string;
  sourceMessageId: string;
};

type ThreadAiInsights = {
  summary: string[];
  smartReplies: string[];
  actionItems: AiActionItem[];
  meetingNotes: string[];
};

type ThreadAiSearchResults = {
  messages: Array<{ id: string; body: string; score: number; author: string; createdAt: string }>;
  files: Array<{ id: string; fileName: string; score: number }>;
  users: Array<{ id: string; name: string; roleName: string | null; score: number }>;
  documents: Array<{ id: string; fileName: string; filePath: string; excerpt: string; score: number }>;
};

type ThreadAssistantAnswer = {
  answer: string;
  citations: string[];
};

type ConversationMode = "conversation" | "files" | "tasks" | "wiki" | "polls" | "meetings" | "bots" | "apps" | "ai" | "pinned" | "catchup";

function buildWorkOrderDetailHref(userType: string | null | undefined, workOrderId: string) {
  const role = (userType ?? "").toUpperCase();

  if (role === "CLIENT") {
    return `/dashboard/client/work-orders/${workOrderId}` as Route;
  }

  if (role === "CONTRACTOR") {
    return `/dashboard/contractor/jobs/${workOrderId}` as Route;
  }

  if (role === "COORDINATOR") {
    return `/dashboard/coordinator/work-orders/${workOrderId}` as Route;
  }

  if (role === "PROCESSOR") {
    return `/dashboard/processor/work-orders/${workOrderId}` as Route;
  }

  return `/dashboard/admin/work-orders/${workOrderId}` as Route;
}

function threadAvatarUrl(thread: ThreadWorkspaceShape["thread"]) {
  const primaryAvatarUrl = thread.primaryParticipant?.avatarUrl ?? null;

  if (thread.isDirectMessage) {
    return primaryAvatarUrl ?? thread.channelImageUrl ?? null;
  }

  return thread.channelImageUrl ?? null;
}

type ThreadWorkspaceShape = {
  thread: {
    id: string;
    title: string | null;
    channelImageUrl: string | null;
    workspaceKey?: string | null;
    workspaceLabel?: string | null;
    threadType: string;
    displayName: string;
    isDirectMessage: boolean;
    participantCount: number;
    primaryParticipant: {
      id: string;
      name: string;
      avatarUrl: string | null;
      isOnline: boolean;
    } | null;
    followedByCurrentUser: boolean;
    pinnedCount: number;
    savedCount: number;
    workOrderId: string | null;
    workOrder: {
      id: string;
      workOrderNumber: string;
      status: string;
      dueDate: string | null;
      property: {
        addressLine1: string;
        city: string;
        state: string;
        postalCode: string;
      };
      client: {
        name: string;
      };
      assignments: Array<{
        vendorCompany: {
          name: string;
        } | null;
      }>;
      services: Array<{
        title: string;
      }>;
    } | null;
  };
  activeCall: {
    id: string;
    roomName: string;
    title: string | null;
    mode: "AUDIO" | "VIDEO";
    status: string;
    startedAt: string;
    endedAt: string | null;
    createdByUser: {
      id: string;
      name: string;
      avatarUrl: string | null;
    } | null;
    participants: Array<{
      id: string;
      userId: string;
      name: string;
      avatarUrl: string | null;
      joinedAt: string;
      leftAt: string | null;
      lastSeenAt: string;
      micEnabled: boolean;
      cameraEnabled: boolean;
    }>;
  } | null;
  timeline: ThreadMessage[];
  members: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    roleKey: string | null;
    roleName: string | null;
    isOnline: boolean;
  }>;
  mentionableUsers: MentionableUser[];
  spaceTasks: SpaceTask[];
  threadAttachments: Array<{
    id: string;
    fileName: string;
    mimeType?: string;
    isImage: boolean;
    createdAt: string;
    messageBody: string | null;
    versionCount?: number;
    versions?: Array<{
      id: string;
      versionNumber: number;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
    }>;
    createdByUser: {
      name: string;
    } | null;
  }>;
  sharedNotes: SharedNote[];
  polls: ThreadPoll[];
  meetings: ThreadMeeting[];
  bots: ThreadBot[];
  integrations: ThreadIntegration[];
  webhooks: ThreadWebhook[];
  guestInvites?: Array<{
    id: string;
    email: string;
    name: string | null;
    accessToken: string;
    invitedAt: string;
    expiresAt: string | null;
    acceptedAt: string | null;
  }>;
  notificationPreferences: {
    global: {
      notifyOnMentions: boolean;
      notifyOnKeywords: boolean;
      keywordList: string | null;
      dndEnabled: boolean;
      dndStartMinutes: number | null;
      dndEndMinutes: number | null;
    };
    thread: {
      level: "ALL" | "MENTIONS_ONLY" | "MUTED";
      mutedUntil: string | null;
      snoozedUntil: string | null;
      customKeywords: string | null;
    };
  };
  aiSummary: string[];
  availableComposeScopes: string[];
};

type LiveMessageThreadPaneProps = {
  session: SessionInfo;
  workspace: ThreadWorkspaceShape;
  activeTab: "conversation" | "profile" | "history";
  initialConversationMode?: ConversationMode;
  dockTopSearchInHeader?: boolean;
  showRealtimeActions?: boolean;
  setActiveTab: (tab: "conversation" | "profile" | "history") => void;
  notice: string | null;
  setNotice: (notice: string | null) => void;
};

function PresenceAvatar({
  name,
  avatarUrl,
  isOnline,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="relative isolate">
      <UserAvatar name={name} avatarUrl={avatarUrl} size={size} />
      {isOnline ? (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
      ) : null}
    </div>
  );
}

function MentionText({ body, mentions }: { body: string; mentions: ThreadMessage["mentions"] }) {
  if (!body) return <></>;
  const safeMentions = mentions ?? [];
  const linkifyPart = (text: string, keyPrefix: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = Array.from(text.matchAll(urlRegex));

    if (matches.length === 0) {
      return [text] as Array<string | JSX.Element>;
    }

    const result: Array<string | JSX.Element> = [];
    let lastIndex = 0;

    matches.forEach((match, index) => {
      const url = match[0];
      const start = match.index ?? 0;

      if (start > lastIndex) {
        result.push(text.slice(lastIndex, start));
      }

      result.push(
        <a
          key={`${keyPrefix}-url-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
        >
          {url}
        </a>
      );

      lastIndex = start + url.length;
    });

    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  };
  
  const processMarkdownAndMentions = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
        let isQuote = false;
        let content = line;
        if (line.trim().startsWith("> ")) {
           isQuote = true;
           content = line.replace(/^>\s*/, "").trim();
        }
        
        const parts: (string | JSX.Element)[] = linkifyPart(content, `line-${lineIdx}`);
        
        if (safeMentions.length) {
            safeMentions.forEach((mention) => {
              const label = mention.mentionedUser?.name ?? mention.mentionedRoleKey ?? "someone";
              const pattern = `@${label}`;
              
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (typeof part === "string" && part.includes(pattern)) {
                  const split = part.split(pattern);
                  const next: (string | JSX.Element)[] = [];
                  split.forEach((t, index) => {
                    next.push(t);
                    if (index < split.length - 1) {
                      next.push(
                        <span key={`mention-${lineIdx}-${mention.id}-${index}`} className="font-semibold text-sky-700 bg-sky-50 px-1 rounded">
                          {pattern}
                        </span>
                      );
                    }
                  });
                  parts.splice(i, 1, ...next);
                  i += next.length - 1;
                }
              }
            });
         }
         
         for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (typeof part === "string" && part.includes("**")) {
                const regex = /\*\*(.*?)\*\*/g;
                let m;
                let lastIndex = 0;
                const next: (string | JSX.Element)[] = [];
                
                while ((m = regex.exec(part)) !== null) {
                    if (m.index > lastIndex) {
                        next.push(part.substring(lastIndex, m.index));
                    }
                    next.push(<strong key={`bold-${lineIdx}-${i}-${m.index}`} className="font-bold">{m[1]}</strong>);
                    lastIndex = regex.lastIndex;
                }
                if (lastIndex < part.length) {
                    next.push(part.substring(lastIndex));
                }
                if (next.length > 0) {
                    parts.splice(i, 1, ...next);
                    i += next.length - 1;
                }
            }
         }
         
         const isBullet = content.trim().startsWith("- ");
         if (isBullet) {
             const cleanParts = parts.map(p => typeof p === 'string' ? p.replace(/^\s*-\s/, "") : p);
             return (
               <li key={`line-${lineIdx}`} className="ml-4 list-disc mt-1">{cleanParts}</li>
             );
         }
         
         return isQuote ? (
            <span key={`line-${lineIdx}`} className="border-l-2 border-slate-400 pl-3 my-1 text-slate-500 block relative bg-slate-50 py-1 pr-2 rounded-r">{parts}</span>
         ) : (
            <span key={`line-${lineIdx}`}>
              {parts}
              {lineIdx < lines.length - 1 && <br />}
            </span>
         );
    });
  };

  return <>{processMarkdownAndMentions(body)}</>;
}

function canAdminApproveSpaceTask(session: SessionInfo) {
  return session.userType === "OFFICE" || session.roles.some((r) => r.includes("ADMIN") || r.includes("MANAGER"));
}

function canManageThreadMessage(session: SessionInfo, message: ThreadMessage) {
  return message.createdByUser?.id === session.id;
}

function getOfflineQueueKey(threadId: string) {
  return `ppw-message-queue:${threadId}`;
}

function readOfflineQueue(threadId: string) {
  if (typeof window === "undefined") {
    return [] as QueuedThreadMessageDraft[];
  }

  try {
    const raw = window.localStorage.getItem(getOfflineQueueKey(threadId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedThreadMessageDraft[]) : [];
  } catch {
    return [];
  }
}

function writeOfflineQueue(threadId: string, drafts: QueuedThreadMessageDraft[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (drafts.length === 0) {
      window.localStorage.removeItem(getOfflineQueueKey(threadId));
      return;
    }

    window.localStorage.setItem(getOfflineQueueKey(threadId), JSON.stringify(drafts));
  } catch {
    // Ignore storage failures and keep the compose flow moving.
  }
}

function normalizeChannelSearchValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function renderHighlightedSearchText(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return text;
  }

  const safeQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safeQuery})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-[#ffe184] px-0.5 text-inherit shadow-[0_0_0_1px_rgba(251,191,36,0.16)]"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );
}

export function LiveMessageThreadPane({
  session,
  workspace,
  activeTab,
  initialConversationMode = "conversation",
  dockTopSearchInHeader = false,
  showRealtimeActions = true,
  setActiveTab,
  notice,
  setNotice,
}: LiveMessageThreadPaneProps) {
  const router = useRouter();
  const [thread, setThread] = useState(workspace);
  const [conversationMode, setConversationMode] = useState<ConversationMode>("conversation");
  const [sessionAvatarUrl, setSessionAvatarUrl] = useState(session.avatarUrl);
  const [startingCallMode, setStartingCallMode] = useState<"AUDIO" | "VIDEO" | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [channelTitleDraft, setChannelTitleDraft] = useState(workspace.thread.title ?? "");
  const [notifyOnMentions, setNotifyOnMentions] = useState(workspace.notificationPreferences.global.notifyOnMentions);
  const [notifyOnKeywords, setNotifyOnKeywords] = useState(workspace.notificationPreferences.global.notifyOnKeywords);
  const [globalKeywordList, setGlobalKeywordList] = useState(workspace.notificationPreferences.global.keywordList ?? "");
  const [threadNotificationLevel, setThreadNotificationLevel] = useState<"ALL" | "MENTIONS_ONLY" | "MUTED">(
    workspace.notificationPreferences.thread.level
  );
  const [threadCustomKeywords, setThreadCustomKeywords] = useState(workspace.notificationPreferences.thread.customKeywords ?? "");
  const [threadSnoozePreset, setThreadSnoozePreset] = useState("0");
  const [dndEnabled, setDndEnabled] = useState(workspace.notificationPreferences.global.dndEnabled);
  const [dndStartMinutes, setDndStartMinutes] = useState<number | null>(workspace.notificationPreferences.global.dndStartMinutes);
  const [dndEndMinutes, setDndEndMinutes] = useState<number | null>(workspace.notificationPreferences.global.dndEndMinutes);
  const [inviteUserIds, setInviteUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ThreadMessage | null>(null);
  const [quotingMessage, setQuotingMessage] = useState<ThreadMessage | null>(null);
  const [threadQuotingMessage, setThreadQuotingMessage] = useState<ThreadMessage | null>(null);
  const [composeBody, setComposeBody] = useState("");
  const [composeFiles, setComposeFiles] = useState<FileList | null>(null);
  const [threadReplyBody, setThreadReplyBody] = useState("");
  const [threadReplyFiles, setThreadReplyFiles] = useState<FileList | null>(null);
  const [dragTarget, setDragTarget] = useState<"main" | "thread" | null>(null);
  const [showCloudPopover, setShowCloudPopover] = useState<"main" | "thread" | null>(null);
  const [cloudProvider, setCloudProvider] = useState<CloudAttachmentDraft["provider"]>("Google Drive");
  const [cloudUrl, setCloudUrl] = useState("");
  const [composeCloudAttachments, setComposeCloudAttachments] = useState<CloudAttachmentDraft[]>([]);
  const [threadCloudAttachments, setThreadCloudAttachments] = useState<CloudAttachmentDraft[]>([]);
  const [showComposeFormatPopover, setShowComposeFormatPopover] = useState(false);
  const [showComposeAttachmentPopover, setShowComposeAttachmentPopover] = useState(false);
  const [showComposeMorePopover, setShowComposeMorePopover] = useState(false);
  const [showComposeExpiryPopover, setShowComposeExpiryPopover] = useState(false);
  const [isRecordingVoiceMessage, setIsRecordingVoiceMessage] = useState(false);
  const [voiceRecorderError, setVoiceRecorderError] = useState<string | null>(null);
  const [voiceRecordingStartedAt, setVoiceRecordingStartedAt] = useState<number | null>(null);
  const [voiceRecordingElapsedMs, setVoiceRecordingElapsedMs] = useState(0);
  const [voiceDraftFile, setVoiceDraftFile] = useState<File | null>(null);
  const [voiceDraftPreviewUrl, setVoiceDraftPreviewUrl] = useState<string | null>(null);
  const [voiceDraftDurationMs, setVoiceDraftDurationMs] = useState(0);
  const [isPlayingVoiceDraft, setIsPlayingVoiceDraft] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState<"main" | "thread" | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState<string | null>(null);
  const EMOJI_LIST = ["👍", "❤️", "🙏", "😂", "😢", "🎉", "🔥", "👀", "✅", "❌", "👏", "🙌", "💯", "✨"];

  const [showTaskPopover, setShowTaskPopover] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskChecklist, setTaskChecklist] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitleDraft, setNoteTitleDraft] = useState("");
  const [noteBodyDraft, setNoteBodyDraft] = useState("");
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollDescription, setPollDescription] = useState("");
  const [pollOptionsDraft, setPollOptionsDraft] = useState("Yes\nNo");
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);
  const [pollClosesAt, setPollClosesAt] = useState("");
  const [submittingPollVotes, setSubmittingPollVotes] = useState<Record<string, boolean>>({});
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingStartsAt, setMeetingStartsAt] = useState("");
  const [meetingEndsAt, setMeetingEndsAt] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [creatingBot, setCreatingBot] = useState(false);
  const [botName, setBotName] = useState("");
  const [botType, setBotType] = useState<"REMINDER" | "WORKFLOW" | "AI_ASSISTANT">("REMINDER");
  const [botDescription, setBotDescription] = useState("");
  const [botPrompt, setBotPrompt] = useState("");
  const [botCadenceMinutes, setBotCadenceMinutes] = useState("60");
  const [creatingIntegration, setCreatingIntegration] = useState(false);
  const [integrationType, setIntegrationType] = useState<"GITHUB" | "JIRA" | "NOTION" | "GENERIC">("GITHUB");
  const [integrationName, setIntegrationName] = useState("");
  const [integrationUrl, setIntegrationUrl] = useState("");
  const [integrationProjectKey, setIntegrationProjectKey] = useState("");
  const [integrationConfig, setIntegrationConfig] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["MESSAGE_CREATED"]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestExpiresInDays, setGuestExpiresInDays] = useState("7");
  const [messageExpiryHours, setMessageExpiryHours] = useState("0");
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, { language: string; body: string }>>({});
  const [messageReactions, setMessageReactions] = useState<MessageReactionMap>({});
  const [aiInsights, setAiInsights] = useState<ThreadAiInsights | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState<ThreadAiSearchResults>({
    messages: [],
    files: [],
    users: [],
    documents: [],
  });
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<ThreadAssistantAnswer | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [runningAiSearch, setRunningAiSearch] = useState(false);
  const [runningAssistant, setRunningAssistant] = useState(false);
  const [channelSearchOpen, setChannelSearchOpen] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const translationTargetLanguage = "bn";

  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
const [mentionAnchorIndex, setMentionAnchorIndex] = useState(-1);
const [mentionTarget, setMentionTarget] = useState<"main" | "thread" | null>(null);
const [composeMentionIds, setComposeMentionIds] = useState<string[]>([]);
  const [threadMentionIds, setThreadMentionIds] = useState<string[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedMessageCount, setQueuedMessageCount] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [uploadingAvatar, startAvatarTransition] = useTransition();
  const [updatingChannel, startChannelTransition] = useTransition();
  const [sending, startSendTransition] = useTransition();

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [isSavingEdit, startSaveEditTransition] = useTransition();
  const [playingMessageAudioId, setPlayingMessageAudioId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const timeline = thread.timeline ?? [];
  const members = thread.members ?? [];
  const mentionableUsers = thread.mentionableUsers ?? [];
  const threadAttachments = thread.threadAttachments ?? [];
  const sharedNotes = thread.sharedNotes ?? [];
  const polls = thread.polls ?? [];
  const meetings = thread.meetings ?? [];
  const bots = thread.bots ?? [];
  const integrations = thread.integrations ?? [];
  const webhooks = thread.webhooks ?? [];
  const spaceTasks = thread.spaceTasks ?? [];
  const aiSummary = thread.aiSummary ?? [];
  const availableComposeScopes = useMemo(() => thread.availableComposeScopes ?? [], [thread.availableComposeScopes]);
  const activeCallParticipants = thread.activeCall?.participants ?? [];
  const quotedHighlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setConversationMode(initialConversationMode);
  }, [initialConversationMode, thread.thread.id]);

  useEffect(() => () => {
    if (quotedHighlightTimeoutRef.current) {
      window.clearTimeout(quotedHighlightTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`ppw-message-reactions:${thread.thread.id}`);
      setMessageReactions(saved ? (JSON.parse(saved) as MessageReactionMap) : {});
    } catch {
      setMessageReactions({});
    }
  }, [thread.thread.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`ppw-message-reactions:${thread.thread.id}`, JSON.stringify(messageReactions));
    } catch {
      // Ignore storage failures and keep the UI responsive.
    }
  }, [messageReactions, thread.thread.id]);

  useEffect(() => {
    setChannelSearchOpen(false);
    setChannelSearchQuery("");
  }, [thread.thread.id]);

  useEffect(() => {
    if (!channelSearchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      channelSearchInputRef.current?.focus();
      channelSearchInputRef.current?.select();
    }, 60);

    return () => window.clearTimeout(timer);
  }, [channelSearchOpen]);

  useEffect(() => {
    if (!isRecordingVoiceMessage || voiceRecordingStartedAt === null) {
      setVoiceRecordingElapsedMs(0);
      return;
    }

    setVoiceRecordingElapsedMs(Date.now() - voiceRecordingStartedAt);
    const interval = window.setInterval(() => {
      setVoiceRecordingElapsedMs(Date.now() - voiceRecordingStartedAt);
    }, 250);

    return () => window.clearInterval(interval);
  }, [isRecordingVoiceMessage, voiceRecordingStartedAt]);

  useEffect(() => {
    return () => {
      voiceRecorderRef.current?.stop();
      voiceRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceRecorderStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (voiceDraftPreviewUrl) {
        URL.revokeObjectURL(voiceDraftPreviewUrl);
      }
    };
  }, [voiceDraftPreviewUrl]);

  useEffect(() => {
    setNotifyOnMentions(thread.notificationPreferences.global.notifyOnMentions);
    setNotifyOnKeywords(thread.notificationPreferences.global.notifyOnKeywords);
    setGlobalKeywordList(thread.notificationPreferences.global.keywordList ?? "");
    setThreadNotificationLevel(thread.notificationPreferences.thread.level);
    setThreadCustomKeywords(thread.notificationPreferences.thread.customKeywords ?? "");
    setDndEnabled(thread.notificationPreferences.global.dndEnabled);
    setDndStartMinutes(thread.notificationPreferences.global.dndStartMinutes);
    setDndEndMinutes(thread.notificationPreferences.global.dndEndMinutes);
  }, [thread.notificationPreferences]);

  function startEditing(msg: ThreadMessage) {
    setEditingMessageId(msg.id);
    setEditBody(msg.body);
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setEditBody("");
  }

  function saveEdit(msgId: string) {
    if (!editBody.trim()) return;
    startSaveEditTransition(async () => {
      const response = await fetch(`/api/messages/message/${msgId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: editBody }),
      });
      if (!response.ok) {
        setNotice("Unable to edit message.");
        return;
      }
      const payload = await response.json();
      setIsOffline(false);
      setThread((current) => ({
        ...current,
        timeline: current.timeline.map((msg) =>
          msg.id === msgId ? { ...msg, body: payload.body, updatedAt: payload.updatedAt } : msg
        ),
      }));
      setEditingMessageId(null);
      setEditBody("");
    });
  }

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadComposerRef = useRef<HTMLTextAreaElement>(null);
  const assistantComposerRef = useRef<HTMLTextAreaElement>(null);
  const mainComposerShellRef = useRef<HTMLDivElement>(null);
  const threadComposerShellRef = useRef<HTMLDivElement>(null);
  const assistantWorkspaceScrollRef = useRef<HTMLDivElement>(null);
  const channelSearchInputRef = useRef<HTMLInputElement>(null);
  const threadPanelScrollRef = useRef<HTMLDivElement>(null);
  const composeFileInputRef = useRef<HTMLInputElement>(null);
  const threadFileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceRecorderChunksRef = useRef<Blob[]>([]);
  const voiceRecorderStreamRef = useRef<MediaStream | null>(null);
  const voiceDraftAudioRef = useRef<HTMLAudioElement | null>(null);
  const messageAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const lastTimelineCountRef = useRef(workspace.timeline?.length ?? 0);
  const isProcessingQueueRef = useRef(false);
  const [mainComposerReserveHeight, setMainComposerReserveHeight] = useState(208);
  const [threadComposerReserveHeight, setThreadComposerReserveHeight] = useState(184);

  useEffect(() => {
    const composerShell = mainComposerShellRef.current;
    if (!composerShell) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(composerShell.getBoundingClientRect().height) + 24;
      setMainComposerReserveHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(composerShell);
    return () => observer.disconnect();
  }, [conversationMode]);

  useEffect(() => {
    const composerShell = threadComposerShellRef.current;
    if (!composerShell) {
      return;
    }

    const updateHeight = () => {
      const nextHeight = Math.ceil(composerShell.getBoundingClientRect().height) + 24;
      setThreadComposerReserveHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(composerShell);
    return () => observer.disconnect();
  }, [replyTo]);

  const mentionableUsersById = useMemo(() => {
    return new Map(mentionableUsers.map((u) => [u.id, u]));
  }, [mentionableUsers]);

  const repliesByParent = useMemo(() => {
    const groups = new Map<string, ThreadMessage[]>();
    timeline.forEach((msg) => {
      if (msg.parentMessageId) {
        const group = groups.get(msg.parentMessageId) ?? [];
        group.push(msg);
        groups.set(msg.parentMessageId, group);
      }
    });
    return groups;
  }, [timeline]);

  const rootMessages = useMemo(() => {
    return timeline.filter((msg) => !msg.parentMessageId);
  }, [timeline]);

  const filteredRootMessages = useMemo(() => {
    const trimmedQuery = channelSearchQuery.trim();
    if (!trimmedQuery) {
      return rootMessages;
    }

    const normalizedQuery = normalizeChannelSearchValue(trimmedQuery);

    return rootMessages.filter((message) => {
      const directParts = [
        message.body,
        message.subject ?? "",
        message.createdByUser?.name ?? "",
        ...(message.attachments ?? []).map((attachment) => attachment.fileName),
      ];

      const replyParts = (repliesByParent.get(message.id) ?? []).flatMap((reply) => [
        reply.body,
        reply.subject ?? "",
        reply.createdByUser?.name ?? "",
        ...(reply.attachments ?? []).map((attachment) => attachment.fileName),
      ]);

      const haystack = normalizeChannelSearchValue([...directParts, ...replyParts].join(" "));
      return haystack.includes(normalizedQuery);
    });
  }, [channelSearchQuery, repliesByParent, rootMessages]);

  const selectedThreadReplyPreviews = useMemo(() => {
    if (!threadReplyFiles) return [];
    return Array.from(threadReplyFiles).map((file) => ({
      name: file.name,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
  }, [threadReplyFiles]);

  useEffect(() => {
    if (!replyTo) {
      return;
    }

    threadPanelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    const focusTimer = window.setTimeout(() => {
      threadComposerRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(focusTimer);
  }, [replyTo]);

  function playChatTone(type: "send" | "receive") {
    try {
      const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === "send") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else {
        // Noisy tone for receive
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // Audio not supported or blocked
    }
  }

  const refreshThread = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      setIsOffline(false);
      setThread((current) => ({
        ...payload,
        // Preserve locally-set channelImageUrl if the polled data loses it
        thread: {
          ...payload.thread,
          channelImageUrl: payload.thread.channelImageUrl ?? current.thread.channelImageUrl,
        },
      }));
      const nextTimelineCount = Array.isArray(payload.timeline) ? payload.timeline.length : 0;
      if (nextTimelineCount > lastTimelineCountRef.current) {
        lastTimelineCountRef.current = nextTimelineCount;
        playChatTone("receive");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }, [thread.thread.id]);

  const submitMessageDraft = useCallback(async (draft: QueuedThreadMessageDraft) => {
    const formData = new FormData();
    formData.set("body", appendCloudAttachmentsToBody(draft.body, draft.cloudAttachments));
    formData.set("threadId", draft.threadId);
    formData.set("visibilityScope", availableComposeScopes[0] ?? "INTERNAL_ONLY");
    formData.set("messageType", "COMMENT");
    if (draft.parentMessageId) {
      formData.set("replyToMessageId", draft.parentMessageId);
    }
    if (draft.quotedMessageId) {
      formData.set("quotedMessageId", draft.quotedMessageId);
    }
    draft.mentionIds.forEach((id) => formData.append("mentionedUserIds", id));
    if (draft.createTask) {
      formData.set("createSpaceTask", "true");
      formData.set("spaceTaskTitle", draft.spaceTaskTitle);
      formData.set("spaceTaskDescription", draft.spaceTaskDescription);
      formData.set("spaceTaskAssigneeId", draft.spaceTaskAssigneeId);
      if (draft.spaceTaskDueAt) {
        formData.set("spaceTaskDueAt", draft.spaceTaskDueAt);
      }
    }

    const response = await fetch(`/api/messages/thread/${draft.threadId}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      let errorMessage = "Unable to send queued message.";
      try {
        const payload = JSON.parse(text);
        if (typeof payload.error === "string") {
          errorMessage = payload.error;
        }
      } catch {
        // Keep fallback message.
      }
      throw new Error(errorMessage);
    }
  }, [availableComposeScopes]);

  const flushOfflineQueue = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine || isProcessingQueueRef.current) {
      return;
    }

    const pending = readOfflineQueue(thread.thread.id);
    setQueuedMessageCount(pending.length);
    if (pending.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    try {
      const remaining: QueuedThreadMessageDraft[] = [];
      for (const draft of pending) {
        try {
          await submitMessageDraft(draft);
        } catch {
          remaining.push(draft);
          break;
        }
      }

      writeOfflineQueue(thread.thread.id, remaining);
      setQueuedMessageCount(remaining.length);
      if (remaining.length === 0) {
        setNotice("Queued messages synced.");
        await refreshThread();
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [thread.thread.id, refreshThread, setNotice, submitMessageDraft]);

  function queueOfflineMessageDraft(draft: QueuedThreadMessageDraft) {
    const nextQueue = [...readOfflineQueue(draft.threadId), draft];
    writeOfflineQueue(draft.threadId, nextQueue);
    setQueuedMessageCount(nextQueue.length);
  }

  function mergeFiles(existing: FileList | null, incoming: FileList | null) {
    if (!incoming || incoming.length === 0) {
      return existing;
    }

    const dt = new DataTransfer();

    if (existing) {
      for (let index = 0; index < existing.length; index += 1) {
        dt.items.add(existing[index]);
      }
    }

    for (let index = 0; index < incoming.length; index += 1) {
      dt.items.add(incoming[index]);
    }

    return dt.files.length > 0 ? dt.files : null;
  }

  function addSingleFile(existing: FileList | null, file: File) {
    const dt = new DataTransfer();

    if (existing) {
      for (let index = 0; index < existing.length; index += 1) {
        dt.items.add(existing[index]);
      }
    }

    dt.items.add(file);
    return dt.files;
  }

  function removeVoiceDraftFromFiles(existing: FileList | null) {
    if (!existing || !voiceDraftFile) {
      return existing;
    }

    const dt = new DataTransfer();
    for (let index = 0; index < existing.length; index += 1) {
      const file = existing[index];
      if (file !== voiceDraftFile) {
        dt.items.add(file);
      }
    }

    return dt.files.length > 0 ? dt.files : null;
  }

  function clearVoiceDraft() {
    if (voiceDraftPreviewUrl) {
      URL.revokeObjectURL(voiceDraftPreviewUrl);
    }
    voiceDraftAudioRef.current?.pause();
    if (voiceDraftAudioRef.current) {
      voiceDraftAudioRef.current.currentTime = 0;
    }
    setComposeFiles((current) => removeVoiceDraftFromFiles(current));
    setVoiceDraftFile(null);
    setVoiceDraftPreviewUrl(null);
    setVoiceDraftDurationMs(0);
    setIsPlayingVoiceDraft(false);
  }

  function cancelVoiceMessageRecording() {
    if (voiceRecorderRef.current && isRecordingVoiceMessage && voiceRecorderRef.current.state !== 'inactive') {
      voiceRecorderChunksRef.current = [];
      voiceRecorderRef.current.stop();
    }
    voiceRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceRecorderStreamRef.current = null;
    voiceRecorderRef.current = null;
    setIsRecordingVoiceMessage(false);
    setVoiceRecordingStartedAt(null);
    setVoiceRecordingElapsedMs(0);
    setVoiceRecorderError(null);
    setNotice('Voice recording discarded.');
  }

  function toggleVoiceDraftPlayback() {
    if (!voiceDraftAudioRef.current) {
      return;
    }

    if (isPlayingVoiceDraft) {
      voiceDraftAudioRef.current.pause();
      setIsPlayingVoiceDraft(false);
      return;
    }

    void voiceDraftAudioRef.current.play();
    setIsPlayingVoiceDraft(true);
  }

  async function toggleVoiceMessageRecording() {
    if (isRecordingVoiceMessage && voiceRecorderRef.current) {
      voiceRecorderRef.current.stop();
      setNotice('Finishing your voice message...');
      return;
    }

    clearVoiceDraft();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const message = 'Voice recording is not supported in this browser.';
      setVoiceRecorderError(message);
      setNotice(message);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      voiceRecorderStreamRef.current = stream;
      voiceRecorderRef.current = recorder;
      voiceRecorderChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceRecorderChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        const message = 'Unable to capture audio right now.';
        setVoiceRecorderError(message);
        setNotice(message);
        setIsRecordingVoiceMessage(false);
        setVoiceRecordingStartedAt(null);
        setVoiceRecordingElapsedMs(0);
        voiceRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceRecorderStreamRef.current = null;
        voiceRecorderRef.current = null;
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(voiceRecorderChunksRef.current, { type: mimeType });

        voiceRecorderChunksRef.current = [];
        voiceRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceRecorderStreamRef.current = null;
        voiceRecorderRef.current = null;
        setIsRecordingVoiceMessage(false);
        const nextDurationMs = voiceRecordingStartedAt ? Date.now() - voiceRecordingStartedAt : voiceRecordingElapsedMs;
        setVoiceRecordingStartedAt(null);

        if (blob.size === 0) {
          setNotice('Voice message was empty. Please try again.');
          return;
        }

        const file = new File([blob], 'voice-message-' + Date.now() + '.' + extension, { type: mimeType });
        const previewUrl = URL.createObjectURL(file);
        setComposeFiles((current) => addSingleFile(removeVoiceDraftFromFiles(current), file));
        if (voiceDraftPreviewUrl) {
          URL.revokeObjectURL(voiceDraftPreviewUrl);
        }
        setVoiceDraftFile(file);
        setVoiceDraftPreviewUrl(previewUrl);
        setVoiceDraftDurationMs(nextDurationMs);
        setIsPlayingVoiceDraft(false);
        setVoiceRecorderError(null);
        setNotice('Voice message attached. Press send when you are ready.');
      };

      recorder.start();
      setIsRecordingVoiceMessage(true);
      setVoiceRecordingStartedAt(Date.now());
      setVoiceRecordingElapsedMs(0);
      setVoiceRecorderError(null);
      setNotice('Recording voice message... click Voice message again to stop.');
    } catch {
      const message = 'Microphone access was blocked. Please allow microphone access and try again.';
      setVoiceRecorderError(message);
      setNotice(message);
      setIsRecordingVoiceMessage(false);
      setVoiceRecordingStartedAt(null);
      setVoiceRecordingElapsedMs(0);
    }
  }

  function formatVoiceRecordingDuration(milliseconds: number) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function createCloudAttachment(provider: CloudAttachmentDraft["provider"], url: string): CloudAttachmentDraft {
    return {
      id: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider,
      url,
    };
  }

  function appendCloudAttachmentsToBody(body: string, cloudAttachments: CloudAttachmentDraft[]) {
    if (cloudAttachments.length === 0) {
      return body;
    }

    const cloudBlock = cloudAttachments
      .map((attachment) => `[${attachment.provider}] ${attachment.url}`)
      .join("\n");

    return body.trim() ? `${body.trim()}\n\n${cloudBlock}` : cloudBlock;
  }

  function handleAddCloudAttachment(target: "main" | "thread") {
    const trimmedUrl = cloudUrl.trim();
    if (!trimmedUrl) {
      setNotice("Please paste a cloud file link.");
      return;
    }

    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setNotice("Use a full cloud share link starting with http:// or https://");
      return;
    }

    const draft = createCloudAttachment(cloudProvider, trimmedUrl);
    if (target === "main") {
      setComposeCloudAttachments((current) => [...current, draft]);
    } else {
      setThreadCloudAttachments((current) => [...current, draft]);
    }

    setCloudUrl("");
    setShowCloudPopover(null);
    setNotice(null);
  }

  function handleComposerDragOver(event: React.DragEvent<HTMLDivElement>, target: "main" | "thread") {
    event.preventDefault();
    if (dragTarget !== target) {
      setDragTarget(target);
    }
  }

  function handleComposerDragLeave(event: React.DragEvent<HTMLDivElement>, target: "main" | "thread") {
    event.preventDefault();
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setDragTarget((current) => (current === target ? null : current));
  }

  function handleComposerDrop(event: React.DragEvent<HTMLDivElement>, target: "main" | "thread") {
    event.preventDefault();
    event.stopPropagation();
    setDragTarget((current) => (current === target ? null : current));

    const incomingFiles = event.dataTransfer?.files;
    if (!incomingFiles || incomingFiles.length === 0) {
      return;
    }

    if (target === "main") {
      setComposeFiles((current) => mergeFiles(current, incomingFiles));
      return;
    }

    setThreadReplyFiles((current) => mergeFiles(current, incomingFiles));
  }

  useEffect(() => {
    const interval = setInterval(() => void refreshThread(), 5000);
    return () => clearInterval(interval);
  }, [refreshThread]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOffline(false);
    setQueuedMessageCount(readOfflineQueue(thread.thread.id).length);

    const handleOnline = () => {
      setIsOffline(false);
      void flushOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [thread.thread.id, flushOfflineQueue]);

  useEffect(() => {
    setThread(workspace);
    lastTimelineCountRef.current = workspace.timeline?.length ?? 0;
    setChannelTitleDraft(workspace.thread.title ?? "");
    setReplyTo(null);
  }, [workspace]);

  useEffect(() => {
    void flushOfflineQueue();
  }, [thread.thread.id, flushOfflineQueue]);

  useEffect(() => {
    if (isOffline || queuedMessageCount === 0) {
      return;
    }

    void flushOfflineQueue();
  }, [flushOfflineQueue, isOffline, queuedMessageCount]);

  useEffect(() => {
    if (sharedNotes.length === 0) {
      if (editingNoteId !== null) {
        setEditingNoteId(null);
        setNoteTitleDraft("");
        setNoteBodyDraft("");
      }
      return;
    }

    if (!editingNoteId || !sharedNotes.some((note) => note.id === editingNoteId)) {
      const firstNote = sharedNotes[0];
      setEditingNoteId(firstNote.id);
      setNoteTitleDraft(firstNote.title);
      setNoteBodyDraft(firstNote.body);
    }
  }, [sharedNotes, editingNoteId]);

  async function toggleFollow(followed: boolean) {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/follow`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ followed }),
    });
    if (response.ok) {
      setThread((current) => ({
        ...current,
        thread: { ...current.thread, followedByCurrentUser: followed },
      }));
    }
  }

  async function startConference(mode: "AUDIO" | "VIDEO") {
    setStartingCallMode(mode);
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}/calls`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, title: thread.thread.displayName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(
          typeof payload.error === "string" ? payload.error : "Unable to start call."
        );
        return;
      }
      setThread((current) => ({ ...current, activeCall: payload.call }));
      setShowCallModal(true);
    } catch (error) {
      setNotice("Unable to reach the calling service right now.");
      console.error("Error starting conference:", error);
    } finally {
      setStartingCallMode(null);
    }
  }

  async function endConference() {
    if (!thread.activeCall) return;
    const response = await fetch(`/api/messages/calls/${thread.activeCall.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "end" })
    });
    if (response.ok) {
      setThread((current) => ({ ...current, activeCall: null }));
    }
  }

  function formatMinutesForInput(value: number | null) {
    if (value === null || value === undefined) return "";
    const hours = Math.floor(value / 60).toString().padStart(2, "0");
    const minutes = (value % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function parseTimeInputToMinutes(value: string) {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map((part) => Number(part));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  }

  async function updateChannelSettings(data: { title?: string; avatarAssetId?: string }) {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to update channel.");
      return;
    }
    setThread((current) => ({
      ...current,
      thread: {
        ...current.thread,
        title: payload.thread.title,
        channelImageUrl: payload.thread.channelImageUrl,
      },
    }));
    setNotice("Channel updated.");
    router.refresh(); // Sync the server-side sidebar
  }

  async function saveNotificationSettings() {
    const snoozedUntil =
      threadSnoozePreset === "0"
        ? null
        : new Date(Date.now() + Number(threadSnoozePreset) * 60 * 1000).toISOString();

    const response = await fetch(`/api/messages/thread/${thread.thread.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        notificationSettings: {
          global: {
            notifyOnMentions,
            notifyOnKeywords,
            keywordList: globalKeywordList.trim() || null,
            dndEnabled,
            dndStartMinutes,
            dndEndMinutes,
          },
          thread: {
            level: threadNotificationLevel,
            customKeywords: threadCustomKeywords.trim() || null,
            mutedUntil: threadNotificationLevel === "MUTED" ? null : null,
            snoozedUntil,
          },
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to save notification settings.");
      return;
    }

    setThread((current) => ({
      ...current,
      notificationPreferences: {
        global: {
          notifyOnMentions,
          notifyOnKeywords,
          keywordList: globalKeywordList.trim() || null,
          dndEnabled,
          dndStartMinutes,
          dndEndMinutes,
        },
        thread: {
          level: threadNotificationLevel,
          mutedUntil: null,
          snoozedUntil,
          customKeywords: threadCustomKeywords.trim() || null,
        },
      },
    }));
    setNotice("Notification settings updated.");
  }

  async function handleChannelPhotoUpload(file: File | null) {
    if (!file) return;

    const previousChannelImageUrl = thread.thread.channelImageUrl;
    // Optimistically show the picture immediately using a local object URL
    const localPreviewUrl = URL.createObjectURL(file);
    setThread((current) => ({
      ...current,
      thread: { ...current.thread, channelImageUrl: localPreviewUrl },
    }));

    try {
      const formData = new FormData();
      formData.set("photo", file);

      const res = await fetch(`/api/messages/thread/${thread.thread.id}/photo`, {
        method: "POST",
        body: formData,
      });

      let uploadPayload: Record<string, unknown> | undefined;
      try {
        uploadPayload = await res.json();
      } catch {
        setNotice("Upload failed — could not read server response.");
        // Revert optimistic update
        setThread((current) => ({
          ...current,
          thread: { ...current.thread, channelImageUrl: previousChannelImageUrl },
        }));
        URL.revokeObjectURL(localPreviewUrl);
        return;
      }

      if (!res.ok) {
        setNotice(uploadPayload?.error ?? "Upload failed.");
        // Revert optimistic update
        setThread((current) => ({
          ...current,
          thread: { ...current.thread, channelImageUrl: previousChannelImageUrl },
        }));
        URL.revokeObjectURL(localPreviewUrl);
        return;
      }

      // Replace optimistic preview with the real permanent URL from the server
      setThread((current) => ({
        ...current,
        thread: { ...current.thread, channelImageUrl: uploadPayload.channelImageUrl ?? null },
      }));

      setNotice("Channel photo updated.");
      URL.revokeObjectURL(localPreviewUrl);
      router.refresh();
    } catch (error) {
      setNotice("File upload error.");
      console.error(error);
      // Revert optimistic update
      setThread((current) => ({
        ...current,
        thread: { ...current.thread, channelImageUrl: previousChannelImageUrl },
      }));
      URL.revokeObjectURL(localPreviewUrl);
    }
  }

  async function inviteMembers() {
    if (inviteUserIds.length === 0) return;
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userIds: inviteUserIds }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Failed to invite members.");
      return;
    }
    setInviteUserIds([]);
    setNotice("Invitations sent.");
    await refreshThread();
  }

  async function removeMember(userId: string) {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/members/${userId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setThread((current) => ({
        ...current,
        members: current.members.filter((m) => m.id !== userId),
      }));
      setNotice("Member removed.");
    }
  }

  async function leaveChannel() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/leave`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to leave channel.");
      return;
    }
    window.location.href = "/messages";
  }

  async function updateSpaceTask(taskId: string, action: "done" | "approve") {
    const response = await fetch(`/api/messages/space-tasks/${taskId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to update task.");
      return;
    }
    setNotice(action === "done" ? "Space task marked done." : "Space task approved and cleared.");
    await refreshThread();
  }

  function beginNewNote() {
    setEditingNoteId(null);
    setNoteTitleDraft("");
    setNoteBodyDraft("");
    setConversationMode("wiki");
  }

  function openNoteForEditing(note: SharedNote) {
    setEditingNoteId(note.id);
    setNoteTitleDraft(note.title);
    setNoteBodyDraft(note.body);
    setConversationMode("wiki");
  }

  async function saveSharedNote() {
    if (!noteTitleDraft.trim() || !noteBodyDraft.trim()) {
      setNotice("Note title and content are required.");
      return;
    }

    const response = await fetch(`/api/messages/thread/${thread.thread.id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        noteId: editingNoteId,
        title: noteTitleDraft,
        body: noteBodyDraft,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to save shared note.");
      return;
    }

    setNotice(editingNoteId ? "Shared note updated." : "Shared note created.");
    if (payload.note?.id) {
      setEditingNoteId(payload.note.id);
      setThread((current) => {
        const incomingNote = payload.note as SharedNote;
        const existing = current.sharedNotes ?? [];
        const nextNotes = editingNoteId
          ? existing.map((note) => (note.id === incomingNote.id ? incomingNote : note))
          : [incomingNote, ...existing];

        return {
          ...current,
          sharedNotes: nextNotes,
        };
      });
    }
    setConversationMode("wiki");
    await refreshThread();
  }

  async function createPoll() {
    const options = pollOptionsDraft
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    const response = await fetch(`/api/messages/thread/${thread.thread.id}/polls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question: pollQuestion,
        description: pollDescription,
        allowsMultiple: pollAllowsMultiple,
        closesAt: pollClosesAt || null,
        options,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to create poll.");
      return;
    }

    setPollQuestion("");
    setPollDescription("");
    setPollOptionsDraft("Yes\nNo");
    setPollAllowsMultiple(false);
    setPollClosesAt("");
    setCreatingPoll(false);
    setNotice("Poll created.");
    if (payload.poll?.id) {
      setThread((current) => ({
        ...current,
        polls: [payload.poll as ThreadPoll, ...(current.polls ?? [])],
      }));
    }
    await refreshThread();
  }

  async function submitPollVote(pollId: string, optionIds: string[]) {
    if (optionIds.length === 0) {
      setNotice("Select at least one poll option.");
      return;
    }

    setSubmittingPollVotes((current) => ({ ...current, [pollId]: true }));
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionIds }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to submit vote.");
        return;
      }

      setNotice("Vote submitted.");
      await refreshThread();
    } finally {
      setSubmittingPollVotes((current) => ({ ...current, [pollId]: false }));
    }
  }

  async function scheduleMeeting() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/meetings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: meetingTitle,
        description: meetingDescription,
        startsAt: meetingStartsAt,
        endsAt: meetingEndsAt,
        location: meetingLocation,
        meetingUrl: meetingUrl,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to schedule meeting.");
      return;
    }

    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingStartsAt("");
    setMeetingEndsAt("");
    setMeetingLocation("");
    setMeetingUrl("");
    setCreatingMeeting(false);
    setNotice("Meeting scheduled.");
    if (payload.meeting?.id) {
      setThread((current) => ({
        ...current,
        meetings: [payload.meeting as ThreadMeeting, ...(current.meetings ?? [])],
      }));
    }
    await refreshThread();
  }

  async function createBot() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/bots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: botName,
        botType,
        description: botDescription,
        prompt: botPrompt,
        cadenceMinutes: Number(botCadenceMinutes) || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to create bot.");
      return;
    }
    setBotName("");
    setBotDescription("");
    setBotPrompt("");
    setBotCadenceMinutes("60");
    setBotType("REMINDER");
    setCreatingBot(false);
    setNotice("Bot created.");
    if (payload.bot?.id) {
      setThread((current) => ({
        ...current,
        bots: [payload.bot as ThreadBot, ...(current.bots ?? [])],
      }));
    }
    await refreshThread();
  }

  async function createIntegration() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/integrations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        integrationType,
        displayName: integrationName,
        workspaceUrl: integrationUrl,
        projectKey: integrationProjectKey,
        configJson: integrationConfig,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to save integration.");
      return;
    }
    setIntegrationName("");
    setIntegrationUrl("");
    setIntegrationProjectKey("");
    setIntegrationConfig("");
    setIntegrationType("GITHUB");
    setCreatingIntegration(false);
    setNotice("Integration saved.");
    await refreshThread();
  }

  async function createWebhook() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/webhooks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: webhookName,
        targetUrl: webhookUrl,
        secret: webhookSecret,
        subscribedEvents: webhookEvents,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to save webhook.");
      return;
    }
    setWebhookName("");
    setWebhookUrl("");
    setWebhookSecret("");
    setWebhookEvents(["MESSAGE_CREATED"]);
    setCreatingWebhook(false);
    setNotice("Webhook saved.");
    await refreshThread();
  }

  async function inviteGuest() {
    const response = await fetch(`/api/messages/thread/${thread.thread.id}/guests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: guestName,
        email: guestEmail,
        expiresInDays: Number(guestExpiresInDays || "7"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to invite guest.");
      return;
    }
    setGuestName("");
    setGuestEmail("");
    setGuestExpiresInDays("7");
    setNotice("Guest invite created.");
    await refreshThread();
  }

  async function translateMessage(messageId: string) {
    const response = await fetch(`/api/messages/message/${messageId}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetLanguage: translationTargetLanguage }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNotice(payload.error ?? "Unable to translate message.");
      return;
    }
    setTranslatedMessages((current) => ({
      ...current,
      [messageId]: {
        language: "Bangla",
        body: String(payload.translatedBody ?? ""),
      },
    }));
  }

  async function openDirectMessage(userId: string) {
    const res = await fetch("/api/messages/dm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.threadId) {
      router.push(`/messages?thread=${data.threadId}`);
      return;
    }
    setNotice(data.error ?? "Unable to open direct message.");
  }

  function toggleMessageReaction(messageId: string, emoji: string) {
    setMessageReactions((current) => {
      const existing = current[messageId] ?? [];
      const next = existing.includes(emoji)
        ? existing.filter((item) => item !== emoji)
        : [...existing, emoji];

      if (next.length === 0) {
        const rest = { ...current };
        delete rest[messageId];
        return rest;
      }

      return {
        ...current,
        [messageId]: next,
      };
    });
  }

  function focusMessageHover(messageId: string) {
    if (showMessageMenu && showMessageMenu !== messageId) {
      setShowMessageMenu(null);
    }
    if (showMessageEmojiPicker && showMessageEmojiPicker !== messageId) {
      setShowMessageEmojiPicker(null);
    }
  }

  async function loadAiInsights() {
    setLoadingAi(true);
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}/ai`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to load AI insights.");
        return;
      }
      setAiInsights(payload as ThreadAiInsights);
    } finally {
      setLoadingAi(false);
    }
  }

  useEffect(() => {
    if (conversationMode === "ai" || conversationMode === "catchup") {
      void loadAiInsights();
    }
  }, [conversationMode, thread.thread.id]);

  useEffect(() => {
    if (conversationMode !== "ai") {
      return;
    }

    setChannelSearchOpen(false);
    setChannelSearchQuery("");
  }, [conversationMode]);

  useEffect(() => {
    if ((!assistantAnswer && !assistantError) || conversationMode !== "ai") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (assistantWorkspaceScrollRef.current) {
        assistantWorkspaceScrollRef.current.scrollTop = 0;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [assistantAnswer, assistantError, conversationMode]);

  async function runAiSearch() {
    const query = aiSearchQuery.trim();
    if (!query) {
      setNotice("Enter a natural language search query.");
      return;
    }

    setRunningAiSearch(true);
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "search", query }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to run AI search.");
        return;
      }
      setAiSearchResults({
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        files: Array.isArray(payload.files) ? payload.files : [],
        users: Array.isArray(payload.users) ? payload.users : [],
        documents: Array.isArray(payload.documents) ? payload.documents : [],
      });
    } finally {
      setRunningAiSearch(false);
    }
  }

  async function runAssistantPrompt() {
    const query = assistantPrompt.trim();
    if (!query) {
      setNotice("Ask the assistant a question about this thread.");
      return;
    }

    assistantComposerRef.current?.blur();
    setAssistantError(null);
    setRunningAssistant(true);
    try {
      const response = await fetch(`/api/messages/thread/${thread.thread.id}/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "assistant", query }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload.error ?? "Unable to get assistant help.";
        setAssistantError(message);
        setNotice(message);
        return;
      }
      setAssistantAnswer({
        answer:
          typeof payload.answer === "string" && payload.answer.trim()
            ? payload.answer.trim()
            : "I couldn't find a usable answer for that yet.",
        citations: Array.isArray(payload.citations)
          ? payload.citations.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          : [],
      });
      setAssistantPrompt("");
    } catch {
      const message = "Unable to get assistant help right now.";
      setAssistantError(message);
      setNotice(message);
    } finally {
      setRunningAssistant(false);
    }
  }

  function buildGoogleCalendarHref(meeting: ThreadMeeting) {
    const start = new Date(meeting.startsAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const end = new Date(meeting.endsAt).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: meeting.title,
      dates: `${start}/${end}`,
      details: meeting.description ?? "",
      location: meeting.location ?? meeting.meetingUrl ?? "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function handleSend(
    parentMessage: ThreadMessage | null,
    body: string,
    files: FileList | null,
    cloudAttachments: CloudAttachmentDraft[],
    mentionIds: string[],
    quotedMessage: ThreadMessage | null,
    onDone?: () => void
  ) {
    const shouldCreateTask = Boolean(taskTitle.trim() && taskAssigneeId);
    
    let effectiveBody = appendCloudAttachmentsToBody(body.trim(), cloudAttachments);
    if (shouldCreateTask) {
       const assignee = members.find(m => m.id === taskAssigneeId);
       const assigneeMention = assignee ? `@${assignee.name}` : "TBD";
       let taskBlock = `[Task: ${taskTitle.trim()} | Assigned to: ${assigneeMention}]`;
       if (taskChecklist.trim()) {
           taskBlock += `\nDetails: ${taskChecklist.trim()}`;
       }
       effectiveBody = effectiveBody ? `${effectiveBody}\n\n${taskBlock}` : taskBlock;
    }

    if (!effectiveBody.trim() && (!files || files.length === 0)) {
      setNotice("Please type a message or attach a file.");
      return;
    }

    const activeMentionIds = mentionIds.filter((id) => {
      const mentionedUser = mentionableUsersById.get(id);
      return mentionedUser ? effectiveBody.includes(`@${mentionedUser.name}`) : false;
    });

    const queuedDraft: QueuedThreadMessageDraft = {
      id: `${thread.thread.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId: thread.thread.id,
      parentMessageId: parentMessage?.id ?? null,
      body: body.trim(),
      cloudAttachments,
      mentionIds: activeMentionIds,
      quotedMessageId: quotedMessage?.id ?? null,
      createTask: shouldCreateTask,
      spaceTaskTitle: taskTitle.trim(),
      spaceTaskDescription: taskChecklist.trim(),
      spaceTaskAssigneeId: taskAssigneeId,
      spaceTaskDueAt: taskDueAt,
      createdAt: new Date().toISOString(),
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      if (files && files.length > 0) {
        setNotice("You are offline. Text, mentions, cloud links, and tasks can queue, but file uploads need a connection.");
        return;
      }

      queueOfflineMessageDraft(queuedDraft);
      onDone?.();
      setTaskTitle("");
      setTaskChecklist("");
      setTaskAssigneeId("");
      setTaskDueAt("");
      setShowTaskPopover(false);
      setNotice("Offline right now. Message queued and will sync automatically.");
      return;
    }

    startSendTransition(() => {
      void (async () => {
        try {
          const formData = new FormData();
          formData.set("body", effectiveBody);
          formData.set("threadId", thread.thread.id);
          formData.set("visibilityScope", availableComposeScopes[0] ?? "INTERNAL_ONLY");
          formData.set("messageType", "COMMENT");
          if (parentMessage) {
            formData.set("replyToMessageId", parentMessage.id);
          }
          if (quotedMessage) {
            formData.set("quotedMessageId", quotedMessage.id);
          }
          if (Number(messageExpiryHours) > 0) {
            formData.set("expiresInHours", messageExpiryHours);
          }
          activeMentionIds.forEach((id) => formData.append("mentionedUserIds", id));
          if (shouldCreateTask) {
            formData.set("createSpaceTask", "true");
            formData.set("spaceTaskTitle", taskTitle.trim());
            formData.set("spaceTaskDescription", taskChecklist.trim());
            formData.set("spaceTaskAssigneeId", taskAssigneeId);
            if (taskDueAt) {
              formData.set("spaceTaskDueAt", taskDueAt);
            }
          }
          if (files) {
            Array.from(files).forEach((file) => formData.append("directFiles", file));
          }

          const response = await fetch(`/api/messages/thread/${thread.thread.id}`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const text = await response.text();
            try {
              const payload = JSON.parse(text);
              if ((!files || files.length === 0) && typeof navigator !== "undefined" && !navigator.onLine) {
                setIsOffline(true);
                queueOfflineMessageDraft(queuedDraft);
                onDone?.();
                setTaskTitle("");
                setTaskChecklist("");
                setTaskAssigneeId("");
                setTaskDueAt("");
                setShowTaskPopover(false);
                setNotice("Connection dropped. Message queued and will sync automatically.");
                return;
              }
              setNotice(payload.error ?? "Unable to send message.");
            } catch {
              if ((!files || files.length === 0) && typeof navigator !== "undefined" && !navigator.onLine) {
                setIsOffline(true);
                queueOfflineMessageDraft(queuedDraft);
                onDone?.();
                setTaskTitle("");
                setTaskChecklist("");
                setTaskAssigneeId("");
                setTaskDueAt("");
                setShowTaskPopover(false);
                setNotice("Connection dropped. Message queued and will sync automatically.");
                return;
              }
              setNotice("Unable to send message.");
            }
            return;
          }

          const payload = await response.json();

          setThread((current) => ({
            ...current,
            timeline: [...current.timeline, payload.message as ThreadMessage],
            spaceTasks: payload.spaceTask ? [payload.spaceTask as SpaceTask, ...current.spaceTasks] : current.spaceTasks,
          }));
          lastTimelineCountRef.current += 1;
          playChatTone("send");
          onDone?.();
          setTaskTitle("");
          setTaskChecklist("");
          setTaskAssigneeId("");
          setTaskDueAt("");
          setShowTaskPopover(false);
          setNotice(null);
          await refreshThread();
        } catch (error) {
          console.error("Failed to send thread message", error);
          setNotice("Unable to reach the messaging service right now.");
        }
      })();
    });
  }


  function handleAvatarUpload(file: File | null) {
    if (!file) return;
    startAvatarTransition(async () => {
      const formData = new FormData();
      formData.set("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const payload = await res.json();
      if (!res.ok) {
        setNotice(payload.error ?? "Unable to update profile photo.");
        return;
      }
      setSessionAvatarUrl(payload.avatarUrl ?? null);
      setNotice("Profile photo updated.");
      await refreshThread();
    });
  }

function handleTextChange(
  e: React.ChangeEvent<HTMLTextAreaElement>,
  panel: "main" | "thread",
  setBody: (val: string) => void,
  setAnchor: (val: number) => void
) {
  const val = e.target.value;
  setBody(val);
  e.target.style.height = 'auto';
  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;

  const cursor = e.target.selectionStart;
  const textBeforeCursor = val.slice(0, cursor);
  const match = textBeforeCursor.match(/@(\w*)$/);

  if (match) {
    setMentionTarget(panel);
    setMentionQuery(match[1]);
    setAnchor(match.index!);
    const query = match[1].toLowerCase();

    const filtered = mentionableUsers
      .filter((u) => !val.includes(`@${u.name}`))
      .filter((u) => u.name.toLowerCase().includes(query) || u.roleName?.toLowerCase().includes(query))
      .map((u) => ({ ...u }));

    setMentionSuggestions(filtered as MentionSuggestion[]);
    setSelectedMentionIndex(0);
    return;
  }

  setMentionTarget(null);
  setMentionQuery(null);
  setMentionSuggestions([]);
}

function handleKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  panel: "main" | "thread",
  body: string,
  setBody: (val: string) => void,
  mentionIds: string[],
  setMentionIds: React.Dispatch<React.SetStateAction<string[]>>,
  onSubmit: () => void
) {
  if (mentionTarget === panel && mentionQuery !== null && mentionSuggestions.length > 0) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const suggestion = mentionSuggestions[selectedMentionIndex];
      if (!suggestion) {
        return;
      }

      const before = body.slice(0, mentionAnchorIndex);
      const after = body.slice(mentionAnchorIndex + mentionQuery.length + 1);
      setBody(`${before}@${suggestion.name} ${after}`);

      if (!mentionIds.includes(suggestion.id)) {
        setMentionIds((prev) => [...prev, suggestion.id]);
      }

      setMentionTarget(null);
      setMentionQuery(null);
      setMentionSuggestions([]);
      return;
    }
    if (e.key === "Escape") {
       setMentionTarget(null);
       setMentionQuery(null);
       setMentionSuggestions([]);
       return;
    }
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    onSubmit();
  }
}

  const [openImageViewer, setOpenImageViewer] = useState<{
    images: Array<{
      id: string;
      url: string;
      title: string;
      downloadHref?: string;
    }>;
    index: number;
  } | null>(null);
  const [openAttachmentPreview, setOpenAttachmentPreview] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    previewHref: string;
  } | null>(null);
  const [openAttachmentVersions, setOpenAttachmentVersions] = useState<ThreadWorkspaceShape["threadAttachments"][number] | null>(null);
  const activeEditingNote = sharedNotes.find((note) => note.id === editingNoteId) ?? null;

  const getMessageAttachmentHref = (attachmentId: string) => `/messages/attachments/${attachmentId}`;
  const getMessageAttachmentPreviewHref = (attachmentId: string) => `/messages/attachments/${attachmentId}?preview=1`;
  const getMessageAttachmentVersionHref = (attachmentId: string, versionId: string) =>
    `/messages/attachments/${attachmentId}?version=${versionId}`;
  const getMessageAttachmentVersionPreviewHref = (attachmentId: string, versionId: string) =>
    `/messages/attachments/${attachmentId}?preview=1&version=${versionId}`;

  const isPdfAttachment = (fileName: string, mimeType: string) =>
    mimeType === "application/pdf" || /\.pdf$/i.test(fileName);

  const isVoiceAttachment = (fileName: string, mimeType: string) =>
    mimeType.startsWith("audio/") || /voice-message|\.(webm|ogg|mp3|wav|m4a)$/i.test(fileName);

  const isVideoAttachment = (fileName: string, mimeType: string) =>
    mimeType.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(fileName);

  const isCodeAttachment = (fileName: string, mimeType: string) =>
    mimeType.startsWith("text/") ||
    [
      "application/json",
      "application/javascript",
      "application/typescript",
      "application/xml",
    ].includes(mimeType) ||
    /\.(txt|md|json|js|jsx|ts|tsx|css|scss|html|xml|yml|yaml|log|csv)$/i.test(fileName);

  const openImageAttachmentViewer = (
    attachments: Array<{ id: string; fileName: string; isImage: boolean }>,
    attachmentId: string
  ) => {
    const imageAttachments = attachments.filter((attachment) => attachment.isImage);
    const index = imageAttachments.findIndex((attachment) => attachment.id === attachmentId);

    if (index < 0) {
      return;
    }

    setOpenImageViewer({
      images: imageAttachments.map((attachment) => ({
        id: attachment.id,
        url: getMessageAttachmentPreviewHref(attachment.id),
        title: attachment.fileName,
        downloadHref: getMessageAttachmentHref(attachment.id),
      })),
      index,
    });
  };

  const isGeneratedAttachmentSummary = (
    body: string,
    attachments: ThreadMessage["attachments"] | undefined
  ) => {
    const safeAttachments = attachments ?? [];
    if (safeAttachments.length === 0) {
      return false;
    }

    return body.trim() === `📎 ${safeAttachments.map((attachment) => attachment.fileName).join(", ")}`;
  };

  const getDisplayBody = (message: Pick<ThreadMessage, "body" | "attachments">) =>
    isGeneratedAttachmentSummary(message.body, message.attachments) ? "" : message.body;

  function toggleMessageAudioPlayback(attachmentId: string) {
    const audio = messageAudioRefs.current[attachmentId];
    if (!audio) {
      return;
    }

    if (playingMessageAudioId === attachmentId) {
      audio.pause();
      setPlayingMessageAudioId(null);
      return;
    }

    if (playingMessageAudioId && messageAudioRefs.current[playingMessageAudioId]) {
      messageAudioRefs.current[playingMessageAudioId]?.pause();
    }

    void audio.play();
    setPlayingMessageAudioId(attachmentId);
  }

  const renderMessageAttachments = (
    attachments: ThreadMessage["attachments"] | undefined,
    compact = false
  ) => {
    const safeAttachments = attachments ?? [];
    if (safeAttachments.length === 0) {
      return null;
    }

    return (
      <div className={cn("mt-2 flex flex-wrap gap-2", compact ? "max-w-sm" : "max-w-2xl")}>
        {safeAttachments.map((attachment) => {
          const attachmentHref = getMessageAttachmentHref(attachment.id);
          const previewHref = getMessageAttachmentPreviewHref(attachment.id);

          if (attachment.isImage) {
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => openImageAttachmentViewer(safeAttachments, attachment.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md",
                  compact ? "h-20 w-20" : "h-32 w-32"
                )}
                title={attachment.fileName}
              >
                <img src={previewHref} alt={attachment.fileName} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent px-2 py-1.5 text-left opacity-0 transition group-hover:opacity-100">
                  <p className="truncate text-[10px] font-semibold text-white">{attachment.fileName}</p>
                </div>
              </button>
            );
          }

          if (isVoiceAttachment(attachment.fileName, attachment.mimeType)) {
            return (
              <div
                key={attachment.id}
                className={cn(
                  "overflow-hidden rounded-[1.35rem] border border-[#d9d5ff] bg-[linear-gradient(135deg,rgba(255,255,255,0.99)_0%,rgba(249,244,255,0.98)_45%,rgba(239,246,255,0.98)_100%)] shadow-[0_14px_32px_rgba(167,139,250,0.12)]",
                  compact ? "w-full max-w-sm" : "w-full max-w-md"
                )}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleMessageAudioPlayback(attachment.id)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c084fc_0%,#f472b6_50%,#60a5fa_100%)] text-white shadow-[0_14px_26px_rgba(168,85,247,0.25)] transition hover:scale-[1.02]"
                    >
                      {playingMessageAudioId === attachment.id ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 translate-x-[1px]" />}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">Voice note</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                          <span
                            key={bar}
                            className={cn(
                              'w-1.5 rounded-full transition-all duration-200',
                              playingMessageAudioId === attachment.id
                                ? 'bg-gradient-to-t from-violet-500 via-fuchsia-400 to-sky-300 animate-pulse'
                                : 'bg-slate-200'
                            )}
                            style={{ height: (10 + ((bar % 3) + 1) * 5) + 'px', animationDelay: (bar * 100) + 'ms' }}
                          />
                        ))}
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">${attachment.fileName}</p>
                    </div>
                  </div>
                  <a
                    href={attachmentHref}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Download
                  </a>
                  <audio
                    ref={(node) => {
                      messageAudioRefs.current[attachment.id] = node;
                    }}
                    src={attachmentHref}
                    className="hidden"
                    onEnded={() => setPlayingMessageAudioId((current) => (current === attachment.id ? null : current))}
                    onPause={() => setPlayingMessageAudioId((current) => (current === attachment.id ? null : current))}
                    onPlay={() => setPlayingMessageAudioId(attachment.id)}
                  />
                </div>
              </div>
            );
          }

          if (isVideoAttachment(attachment.fileName, attachment.mimeType)) {
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() =>
                  setOpenAttachmentPreview({
                    id: attachment.id,
                    fileName: attachment.fileName,
                    mimeType: attachment.mimeType,
                    previewHref: attachmentHref,
                  })
                }
                className={cn(
                  "group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-violet-200 hover:shadow-md",
                  compact ? "w-48" : "w-72"
                )}
                title={attachment.fileName}
              >
                <div className={cn("relative overflow-hidden bg-slate-950", compact ? "h-24" : "h-40")}>
                  <video
                    src={attachmentHref}
                    className="h-full w-full object-cover opacity-90"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg">
                      <Play className="h-5 w-5 translate-x-[1px]" />
                    </span>
                  </div>
                  <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    Video
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">Tap to preview or download</p>
                </div>
              </button>
            );
          }

          if (isPdfAttachment(attachment.fileName, attachment.mimeType)) {
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() =>
                  setOpenAttachmentPreview({
                    id: attachment.id,
                    fileName: attachment.fileName,
                    mimeType: attachment.mimeType,
                    previewHref,
                  })
                }
                className={cn(
                  "group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-violet-200 hover:shadow-md",
                  compact ? "w-48" : "w-64"
                )}
                title={attachment.fileName}
              >
                <div className={cn("border-b border-slate-100 bg-slate-50", compact ? "h-24" : "h-32")}>
                  <iframe
                    src={previewHref}
                    title={attachment.fileName}
                    className="h-full w-full pointer-events-none"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">PDF preview</p>
                </div>
              </button>
            );
          }

          if (isCodeAttachment(attachment.fileName, attachment.mimeType)) {
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() =>
                  setOpenAttachmentPreview({
                    id: attachment.id,
                    fileName: attachment.fileName,
                    mimeType: attachment.mimeType,
                    previewHref,
                  })
                }
                className={cn(
                  "group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-violet-200 hover:shadow-md",
                  compact ? "w-48" : "w-64"
                )}
                title={attachment.fileName}
              >
                <div className="border-b border-slate-100 bg-slate-950 px-3 py-2">
                  <code className="text-[11px] font-medium text-emerald-300">{attachment.fileName}</code>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">Code/text preview</p>
                </div>
              </button>
            );
          }

          return (
            <button
              key={attachment.id}
              type="button"
              onClick={() =>
                setOpenAttachmentPreview({
                  id: attachment.id,
                  fileName: attachment.fileName,
                  mimeType: attachment.mimeType,
                  previewHref: attachmentHref,
                })
              }
              className={cn(
                "group rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-200 hover:bg-sky-50",
                compact ? "w-[220px]" : "w-72"
              )}
              title={attachment.fileName}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f7f2ff_0%,#eef5ff_100%)] text-sky-600">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{attachment.fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">{attachment.mimeType || "File attachment"}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const bubbleTone = (msg: ThreadMessage) => {
    if (msg.createdByUser?.id === session.id) return "bg-fuchsia-50 border-fuchsia-100 text-slate-800 self-end ml-auto";
    if (msg.visibilityScope === "INTERNAL_ONLY") return "bg-sky-50 border-sky-100 text-slate-700";
    return "bg-white border-slate-200 text-slate-700 shadow-sm";
  };

  async function toggleMessageMeta(messageId: string, action: "pin" | "save", value: boolean) {
    const response = await fetch(`/api/messages/message/${messageId}/meta`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, value }),
    });
    if (response.ok) {
      setThread((current) => ({
        ...current,
        timeline: current.timeline.map((m) =>
          m.id === messageId ? { ...m, isPinned: action === "pin" ? value : m.isPinned, isSaved: action === "save" ? value : m.isSaved } : m
        ),
        thread: {
          ...current.thread,
          pinnedCount: action === "pin" ? (value ? current.thread.pinnedCount + 1 : current.thread.pinnedCount - 1) : current.thread.pinnedCount,
          savedCount: action === "save" ? (value ? current.thread.savedCount + 1 : current.thread.savedCount - 1) : current.thread.savedCount,
        }
      }));
    }
  }

  async function deleteMessage(messageId: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    const response = await fetch(`/api/messages/message/${messageId}`, {
      method: "DELETE",
    });
    const payload = await response.json();
    if (response.ok) {
        setThread((current) => ({
            ...current,
            timeline: current.timeline.map((m) =>
              m.id === messageId ? { ...m, body: "This message was deleted by the author.", messageType: "SYSTEM_EVENT" } : m
            )
        }));
    } else {
        setNotice(payload.error || "Unable to delete message");
    }
  }

  const taskChips = ["Needs bid", "Photos missing", "Ready for QC", "Approved", "Issue found"];

  function openMentionPicker(
    panel: "main" | "thread",
    current: string,
    setter: (val: string) => void,
    ref?: React.RefObject<HTMLTextAreaElement | null>
  ) {
    const anchor = ref?.current?.selectionStart ?? current.length;
    insertAtCursor('@', setter, current, ref);
    setMentionTarget(panel);
    setMentionQuery('');
    setMentionAnchorIndex(anchor);
    setMentionSuggestions(mentionableUsers.map((u) => ({ ...u })) as MentionSuggestion[]);
    setSelectedMentionIndex(0);
  }

  function insertAtCursor(text: string, setter: (val: string) => void, current: string, ref?: React.RefObject<HTMLTextAreaElement | null>) {
    if (ref && ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const newText = current.substring(0, start) + text + current.substring(end);
      setter(newText);
      setTimeout(() => {
        if (ref.current) {
          ref.current.selectionStart = ref.current.selectionEnd = start + text.length;
          ref.current.focus();
        }
      }, 0);
    } else {
      setter(current + (current && !current.endsWith(" ") ? " " : "") + text + " ");
    }
  }

  function applyFormat(wrap: { before: string; after: string }, current: string, setter: (val: string) => void, ref?: React.RefObject<HTMLTextAreaElement | null>) {
    if (ref && ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const selectedText = current.substring(start, end);
      const newText = current.substring(0, start) + wrap.before + selectedText + wrap.after + current.substring(end);
      setter(newText);
      setTimeout(() => {
        if (ref.current) {
          ref.current.selectionStart = ref.current.selectionEnd = start + wrap.before.length + selectedText.length + wrap.after.length;
          ref.current.focus();
        }
      }, 0);
    } else {
      setter(wrap.before + current + wrap.after);
    }
  }

  function insertTaskBlock(target: "main" | "thread") {
    const block = `[Task: ${taskTitle} | Assignee: ${mentionableUsersById.get(taskAssigneeId)?.name ?? "TBD"}]`;
    if (target === "main") {
      setComposeBody((v) => v + (v && !v.endsWith(" ") ? " " : "") + block + " ");
      if (taskAssigneeId && !composeMentionIds.includes(taskAssigneeId)) {
        setComposeMentionIds((prev) => [...prev, taskAssigneeId]);
      }
    } else {
      setThreadReplyBody((v) => v + (v && !v.endsWith(" ") ? " " : "") + block + " ");
      if (taskAssigneeId && !threadMentionIds.includes(taskAssigneeId)) {
        setThreadMentionIds((prev) => [...prev, taskAssigneeId]);
      }
    }
    setShowTaskPopover(false);
  }

  const SettingsContent = () => (
    <div className="space-y-6">
      {!thread.thread.isDirectMessage ? (
        <>
          <div className="rounded-3xl border border-fuchsia-100 bg-[linear-gradient(180deg,#fff9ff_0%,#f8f4ff_100%)] p-5">
            <div className="flex items-center gap-4">
              <div className="relative group block shrink-0">
                <label className="cursor-pointer block relative">
                  <UserAvatar name={thread.thread.displayName} avatarUrl={threadAvatarUrl(thread.thread)} size="xl" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
                    <span className="text-[10px] text-white font-semibold uppercase">{updatingChannel ? '...' : 'Upload'}</span>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      try {
                        await handleChannelPhotoUpload(file);
                      } finally {
                        e.target.value = "";
                      }
                    }} 
                    disabled={updatingChannel} 
                  />
                </label>
                {thread.thread.channelImageUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Remove channel photo?")) return;
                      const res = await fetch(`/api/messages/thread/${thread.thread.id}/photo`, { method: "DELETE" });
                      if (res.ok) {
                        setThread((current) => ({
                          ...current,
                          thread: { ...current.thread, channelImageUrl: null },
                        }));
                        setNotice("Channel photo removed.");
                        router.refresh();
                      } else {
                        setNotice("Failed to remove photo.");
                      }
                    }}
                    disabled={updatingChannel}
                    className="absolute top-0 right-0 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white opacity-0 group-hover:opacity-100 transition hover:bg-slate-900 shadow-sm disabled:opacity-50"
                    title="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Channel identity</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    value={channelTitleDraft}
                    onChange={(event) => setChannelTitleDraft(event.target.value)}
                    placeholder="Channel name"
                    className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-fuchsia-300"
                  />
                  <button
                    type="button"
                    onClick={() => startChannelTransition(() => void updateChannelSettings({ title: channelTitleDraft }))}
                    disabled={updatingChannel || channelTitleDraft.trim().length === 0}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {updatingChannel ? "..." : "Rename"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Members ({members.length})</p>
            <div className="mt-4 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                  <UserHoverCard
                    currentUserId={session.id}
                    user={{ id: member.id, name: member.name, avatarUrl: member.avatarUrl, roleName: member.roleName, isOnline: member.isOnline }}
                  >
                    <PresenceAvatar name={member.name} avatarUrl={member.avatarUrl} isOnline={member.isOnline} size="sm" />
                  </UserHoverCard>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                    <p className="truncate text-xs text-slate-500">{member.roleName ?? "Member"}</p>
                  </div>
                  {member.id !== session.id && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => void removeMember(member.id)} className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-full transition" title="Remove Member">
                        <UserMinus className="h-4 w-4" />
                      </button>
                      <form action={blockUserAction}>
                         <input type="hidden" name="threadId" value={thread.thread.id} />
                         <input type="hidden" name="blockedUserId" value={member.id} />
                         <button type="submit" className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-full transition" title="Block User">
                           <UserX className="h-4 w-4" />
                         </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Invite Members</p>
              <div className="flex gap-2">
                <select 
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500"
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && !inviteUserIds.includes(id)) setInviteUserIds([...inviteUserIds, id]);
                  }}
                  value=""
                >
                  <option value="" disabled>Select user to add...</option>
                  {mentionableUsers.filter(u => !members.some(m => m.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.roleName || "User"})</option>
                  ))}
                </select>
              </div>
              {inviteUserIds.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1">
                    {inviteUserIds.map(id => {
                      const u = mentionableUsers.find(u => u.id === id);
                      return (
                        <span key={id} className="inline-flex items-center text-[11px] font-semibold bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                          {u?.name} 
                          <button onClick={() => setInviteUserIds(inviteUserIds.filter(i => i !== id))} className="ml-1.5 text-violet-400 hover:text-rose-500 transition">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => void inviteMembers()} className="w-full px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-violet-700 transition">Add Users ({inviteUserIds.length})</button>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This channel</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: "ALL", label: "All" },
                    { value: "MENTIONS_ONLY", label: "Mentions" },
                    { value: "MUTED", label: "Muted" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setThreadNotificationLevel(option.value as "ALL" | "MENTIONS_ONLY" | "MUTED")}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        threadNotificationLevel === option.value
                          ? "border-violet-300 bg-white text-violet-700 shadow-sm"
                          : "border-violet-100 bg-white/70 text-slate-600"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Snooze</p>
                    <select
                      value={threadSnoozePreset}
                      onChange={(event) => setThreadSnoozePreset(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                    >
                      <option value="0">Off</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="240">4 hours</option>
                      <option value="1440">24 hours</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Channel keywords</p>
                    <input
                      value={threadCustomKeywords}
                      onChange={(event) => setThreadCustomKeywords(event.target.value)}
                      placeholder="roof leak, approval"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-violet-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Smart alerts</p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span>Notify me for mentions</span>
                    <input type="checkbox" checked={notifyOnMentions} onChange={(event) => setNotifyOnMentions(event.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span>Notify me for keywords</span>
                    <input type="checkbox" checked={notifyOnKeywords} onChange={(event) => setNotifyOnKeywords(event.target.checked)} />
                  </label>
                  <input
                    value={globalKeywordList}
                    onChange={(event) => setGlobalKeywordList(event.target.value)}
                    placeholder="urgent, invoice, completion"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400"
                  />
                </div>
              </div>

              <div className="border-t border-violet-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Do Not Disturb</p>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span>Enable DND schedule</span>
                    <input type="checkbox" checked={dndEnabled} onChange={(event) => setDndEnabled(event.target.checked)} />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={formatMinutesForInput(dndStartMinutes)}
                      onChange={(event) => setDndStartMinutes(parseTimeInputToMinutes(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                    />
                    <input
                      type="time"
                      value={formatMinutesForInput(dndEndMinutes)}
                      onChange={(event) => setDndEndMinutes(parseTimeInputToMinutes(event.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startChannelTransition(() => void saveNotificationSettings())}
                className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Save Notification Settings
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Workspace & guest access</p>
            <div className="mt-4 space-y-3">
              <input
                value={thread.thread.workspaceLabel ?? ""}
                onChange={(event) => setThread((current) => ({ ...current, thread: { ...current.thread, workspaceLabel: event.target.value } }))}
                placeholder="Workspace label"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
              />
              <input
                value={thread.thread.workspaceKey ?? ""}
                onChange={(event) => setThread((current) => ({ ...current, thread: { ...current.thread, workspaceKey: event.target.value } }))}
                placeholder="workspace-key"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={() => startChannelTransition(async () => {
                  const response = await fetch(`/api/messages/thread/${thread.thread.id}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      workspaceKey: thread.thread.workspaceKey ?? null,
                      workspaceLabel: thread.thread.workspaceLabel ?? null,
                    }),
                  });
                  const payload = await response.json().catch(() => ({}));
                  setNotice(response.ok ? "Workspace details updated." : payload.error ?? "Unable to update workspace details.");
                  if (response.ok) await refreshThread();
                })}
                className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                Save Workspace Details
              </button>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">External guest invite</p>
                <div className="mt-3 space-y-2">
                  <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Guest name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400" />
                  <input value={guestEmail} onChange={(event) => setGuestEmail(event.target.value)} placeholder="guest@example.com" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400" />
                  <select value={guestExpiresInDays} onChange={(event) => setGuestExpiresInDays(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400">
                    <option value="3">Expires in 3 days</option>
                    <option value="7">Expires in 7 days</option>
                    <option value="30">Expires in 30 days</option>
                  </select>
                  <button type="button" onClick={() => void inviteGuest()} className="w-full rounded-xl bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-4 py-2 text-sm font-semibold text-[#2b3159]">
                    Invite Guest
                  </button>
                </div>
                <div className="mt-4 space-y-2">
                  {(thread.guestInvites ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500">No guest invites yet.</p>
                  ) : (
                    (thread.guestInvites ?? []).map((guest) => (
                      <div key={guest.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <p className="font-semibold text-slate-900">{guest.name ?? guest.email}</p>
                        <p>{guest.email}</p>
                        <p className="mt-1">Token: {guest.accessToken.slice(0, 10)}...</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-5">
             <p className="text-sm font-semibold text-rose-900">Management</p>
             <div className="mt-4 space-y-3">
               <button onClick={() => void leaveChannel()} className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">
                 <LogOut className="h-4 w-4" /> Leave channel
               </button>
               <form action={blockMessageThreadAction}>
                 <input type="hidden" name="threadId" value={thread.thread.id} />
                 <button type="submit" className="flex w-full items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm mt-3">
                   <ShieldAlert className="h-4 w-4" /> Block channel
                 </button>
               </form>
               <form action={deleteMessageThreadAction}>
                 <input type="hidden" name="threadId" value={thread.thread.id} />
                 <button type="submit" className="flex w-full items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm mt-3 transition hover:bg-rose-700">
                   <Trash2 className="h-4 w-4" /> Delete chat
                 </button>
               </form>
             </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-3xl border border-violet-100 bg-violet-50/40 p-5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "ALL", label: "All" },
                  { value: "MENTIONS_ONLY", label: "Mentions" },
                  { value: "MUTED", label: "Muted" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setThreadNotificationLevel(option.value as "ALL" | "MENTIONS_ONLY" | "MUTED")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      threadNotificationLevel === option.value
                        ? "border-violet-300 bg-white text-violet-700 shadow-sm"
                        : "border-violet-100 bg-white/70 text-slate-600"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input
                value={threadCustomKeywords}
                onChange={(event) => setThreadCustomKeywords(event.target.value)}
                placeholder="client, bid, schedule"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={formatMinutesForInput(dndStartMinutes)}
                  onChange={(event) => setDndStartMinutes(parseTimeInputToMinutes(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                />
                <input
                  type="time"
                  value={formatMinutesForInput(dndEndMinutes)}
                  onChange={(event) => setDndEndMinutes(parseTimeInputToMinutes(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                />
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span>Enable DND schedule</span>
                <input type="checkbox" checked={dndEnabled} onChange={(event) => setDndEnabled(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span>Notify me for mentions</span>
                <input type="checkbox" checked={notifyOnMentions} onChange={(event) => setNotifyOnMentions(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span>Notify me for keywords</span>
                <input type="checkbox" checked={notifyOnKeywords} onChange={(event) => setNotifyOnKeywords(event.target.checked)} />
              </label>
              <input
                value={globalKeywordList}
                onChange={(event) => setGlobalKeywordList(event.target.value)}
                placeholder="urgent, invoice, follow up"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400"
              />
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Snooze</p>
                <select
                  value={threadSnoozePreset}
                  onChange={(event) => setThreadSnoozePreset(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-400"
                >
                  <option value="0">Off</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="240">4 hours</option>
                  <option value="1440">24 hours</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => startChannelTransition(() => void saveNotificationSettings())}
                className="w-full rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Save Notification Settings
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-rose-100 bg-rose-50/70 p-5">
            {thread.thread.primaryParticipant && (
              <>
                <p className="text-sm font-semibold text-rose-900 text-center">Settings for {thread.thread.primaryParticipant.name}</p>
                <div className="mt-6 space-y-3">
                  <form action={blockUserAction}>
                    <input type="hidden" name="threadId" value={thread.thread.id} />
                    <input type="hidden" name="blockedUserId" value={thread.thread.primaryParticipant.id} />
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50">
                      <UserX className="h-4 w-4" /> Block user
                    </button>
                  </form>
                  <form action={deleteMessageThreadAction}>
                    <input type="hidden" name="threadId" value={thread.thread.id} />
                    <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700">
                      <Trash2 className="h-4 w-4" /> Delete chat
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  const jumpToQuotedMessage = useCallback((messageId: string) => {
    if (typeof document === "undefined") {
      return;
    }

    const target =
      document.getElementById(`message-thread-${messageId}`) ??
      document.getElementById(`message-thread-root-${messageId}`) ??
      document.getElementById(`message-main-${messageId}`);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);

    if (quotedHighlightTimeoutRef.current) {
      window.clearTimeout(quotedHighlightTimeoutRef.current);
    }

    quotedHighlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? null : current));
    }, 1800);
  }, []);

  const renderQuotedMessagePreview = (message: ThreadMessage) => {
    if (!message.quotedMessage) return null;

    const quotedAuthor = message.quotedMessage.createdByUser?.name ?? "Unknown user";
    const quotedBody = message.quotedMessage.body?.trim() || "Message unavailable";

    return (
      <button
        type="button"
        onClick={() => jumpToQuotedMessage(message.quotedMessage!.id)}
        className="mb-2 block w-full rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,rgba(250,245,255,0.96)_0%,rgba(240,246,255,0.96)_100%)] px-3 py-2 text-left shadow-[0_10px_22px_-18px_rgba(139,92,246,0.38)] transition hover:border-violet-200 hover:shadow-[0_14px_28px_-20px_rgba(139,92,246,0.42)]"
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,#d8b4fe_0%,#93c5fd_100%)]" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700/80">Quoted reply from {quotedAuthor}</p>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{quotedBody}</p>
            <p className="mt-1 text-[11px] font-semibold text-violet-600">Jump to original</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {(isOffline || queuedMessageCount > 0) && (
        <div className="mx-7 mt-4 rounded-2xl border border-[rgba(224,183,255,0.82)] bg-[linear-gradient(135deg,rgba(255,244,250,0.94)_0%,rgba(243,241,255,0.94)_52%,rgba(236,245,255,0.94)_100%)] px-4 py-3 text-sm font-medium text-[#4f4d87] shadow-[0_14px_28px_rgba(199,185,241,0.18)]">
          {isOffline
            ? queuedMessageCount > 0
              ? `${queuedMessageCount} message${queuedMessageCount === 1 ? "" : "s"} queued. They will sync automatically when you are back online.`
              : "Offline mode is active. You can keep drafting, and text-only messages will queue automatically."
            : `${queuedMessageCount} queued message${queuedMessageCount === 1 ? "" : "s"} waiting to sync.`}
        </div>
      )}
      {notice && (
        <div className="mx-7 mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          {notice}
        </div>
      )}

      {activeTab === "conversation" ? (
        <div className={cn(
          "grid h-full min-h-0 flex-1 overflow-hidden transition-all duration-300",
          "grid-cols-1"
        )}>
          {/* Main Chat Center */}
          <div className="flex h-full min-h-0 flex-1 flex-col border-r border-slate-200/80">
            {/* Header */}
            <div className={cn(
              "app-animate-soft border-b border-slate-200/80 py-3 shrink-0",
              dockTopSearchInHeader ? "pl-[4.75rem] pr-4" : "px-4"
            )}>
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1">
                {[
                  { key: "conversation", label: "Messages", icon: MessageCircleReply },
                  { key: "files", label: "Files", icon: FolderOpen },
                  { key: "tasks", label: "Tasks", icon: CheckSquare },
                  { key: "meetings", label: "Meet", icon: CalendarDays },
                  { key: "bots", label: "Bots", icon: Bot },
                  { key: "apps", label: "Apps", icon: PlugZap },
                  { key: "pinned", label: "Pin", icon: Pin },
                ].map((item: { key: ConversationMode; label: string; icon: React.ComponentType<{ className?: string }> }) => (
                  <button
                    key={item.key}
                    onClick={() => setConversationMode(item.key)}
                    className={cn(
	                      "app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-1.5 text-[10px] font-semibold leading-none transition sm:px-2 sm:text-[11px]",
	                      conversationMode === item.key
	                        ? "border-[#e8bfff] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)]"
	                        : "border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f4efff_52%,#edf4ff_100%)] text-slate-500 hover:border-[#ddd2ff] hover:bg-[linear-gradient(135deg,#fff5fb_0%,#eff5ff_100%)]"
	                    )}
                  >
                    <item.icon className="h-3 w-3" />
                    <span>{item.label}</span>
                  </button>
                ))}
                {showRealtimeActions ? (
                  thread.activeCall ? (
                    <button
                      onClick={() => setShowCallModal(true)}
                        className="app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-1.5 text-[10px] font-semibold leading-none text-emerald-700 transition hover:bg-emerald-200 sm:px-2 sm:text-[11px]"
                    >
                      <PhoneCall className="h-3 w-3" />
                      <span>Join</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => void startConference("AUDIO")}
                        disabled={startingCallMode !== null}
                        className="app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-1.5 py-1.5 text-[10px] font-semibold leading-none text-sky-700 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-2 sm:text-[11px]"
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>{startingCallMode === "AUDIO" ? "Start" : "Audio"}</span>
                      </button>
                      <button
                        onClick={() => void startConference("VIDEO")}
                        disabled={startingCallMode !== null}
                        className="app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-1.5 py-1.5 text-[10px] font-semibold leading-none text-indigo-700 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-2 sm:text-[11px]"
                      >
                        <Video className="h-3 w-3" />
                        <span>{startingCallMode === "VIDEO" ? "Start" : "Video"}</span>
                      </button>
                    </>
                  )
                ) : null}
                <button
                  onClick={() => setShowChannelSettings(!showChannelSettings)}
                  className={cn(
	                    "app-hover-lift inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-1.5 text-[10px] font-semibold leading-none transition sm:px-2 sm:text-[11px]",
	                    showChannelSettings
	                      ? "border-[#e8bfff] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159]"
	                      : "border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f4efff_52%,#edf4ff_100%)] text-violet-700 hover:border-[#ddd2ff] hover:bg-[linear-gradient(135deg,#fff5fb_0%,#eff5ff_100%)]"
	                  )}
                >
                  <Settings className="h-3 w-3" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={() => void toggleFollow(!thread.thread.followedByCurrentUser)}
                  className={cn(
                    "app-hover-lift inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition",
                    thread.thread.followedByCurrentUser ? "text-amber-500 bg-amber-50" : "text-slate-400 bg-slate-50"
                  )}
                >
                  <Star className="h-4 w-4" fill={thread.thread.followedByCurrentUser ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {thread.activeCall ? (
                <div className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-[linear-gradient(90deg,rgba(236,253,245,0.9)_0%,rgba(239,246,255,0.9)_100%)] px-5 py-3 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {thread.activeCall.mode === "AUDIO" ? "Audio call live" : "Video conference live"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {activeCallParticipants.length} participant{activeCallParticipants.length === 1 ? "" : "s"} in
                    {" "}
                    {thread.thread.displayName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {activeCallParticipants.slice(0, 4).map((participant) => (
                      <div key={participant.id} className="rounded-full ring-2 ring-white">
                        <UserAvatar
                          name={participant.name}
                          avatarUrl={participant.avatarUrl}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCallModal(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Open call
                  </button>
                  <button
                    type="button"
                    onClick={() => void endConference()}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End call
                  </button>
                </div>
              </div>
            ) : null}

            {/* Content Area */}
            <div className={cn(
              "grid h-full min-h-0 flex-1 grid-rows-1",
              replyTo ? "grid-cols-1 xl:grid-cols-[1fr_400px]" : "grid-cols-1"
            )}>
              <div className="relative flex min-h-0 h-full flex-col overflow-hidden">
                 <div className={cn(
                   "min-h-0 flex-1 bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] px-5 py-6",
                   conversationMode === "ai" ? "overflow-hidden" : "overflow-y-auto overscroll-contain"
                 )}
                 style={
                   conversationMode === "ai"
                     ? undefined
                     : {
                         paddingBottom: `${mainComposerReserveHeight}px`,
                         scrollPaddingBottom: `${mainComposerReserveHeight + 24}px`,
                       }
                 }>
                    {conversationMode !== "ai" ? (
                      <>
                        <div className="mx-auto mb-6 flex w-full max-w-[1080px] items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <h2 className="truncate text-xl font-bold text-slate-900">{thread.thread.displayName}</h2>
                              {!thread.thread.isDirectMessage ? (
                                <div
                                  className={cn(
                                    "flex items-center overflow-hidden rounded-full border bg-white/92 shadow-[0_10px_22px_rgba(196,181,253,0.14)] transition-all duration-300 ease-out",
                                    channelSearchOpen
                                      ? "w-[210px] border-[#ddd2ff] px-3 py-1.5"
                                      : "w-8 border-[#e3dcff] px-0 py-0"
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (channelSearchOpen) {
                                        channelSearchInputRef.current?.focus();
                                        return;
                                      }
                                      setChannelSearchOpen(true);
                                    }}
                                    className={cn(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
                                      channelSearchOpen
                                        ? "text-[#2b3159]"
                                        : "text-violet-700 hover:border-[#ddd2ff] hover:bg-[linear-gradient(135deg,#fff5fb_0%,#eff5ff_100%)]"
                                    )}
                                    aria-label={`Search this conversation in ${thread.thread.displayName}`}
                                    title={`Search this conversation in ${thread.thread.displayName}`}
                                  >
                                    <Search className="h-3.5 w-3.5" />
                                  </button>
                                  <div
                                    className={cn(
                                      "flex min-w-0 items-center gap-2 transition-all duration-300 ease-out",
                                      channelSearchOpen ? "w-full opacity-100" : "w-0 opacity-0"
                                    )}
                                  >
                                    <input
                                      ref={channelSearchInputRef}
                                      value={channelSearchQuery}
                                      onChange={(event) => setChannelSearchQuery(event.target.value)}
                                      placeholder="Search this conversation"
                                      className="h-5 w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setChannelSearchOpen(false);
                                        setChannelSearchQuery("");
                                      }}
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                      aria-label="Close conversation search"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {thread.thread.isDirectMessage
                                ? "Direct conversation"
                                : `${members.length} member${members.length === 1 ? "" : "s"} in this channel`}
                            </p>
                          </div>
                        </div>
                        {conversationMode === "conversation" && channelSearchQuery.trim() ? (
                          <div className="mx-auto mb-6 flex w-full max-w-[1080px] items-center justify-between gap-3 rounded-2xl border border-[#ebe2ff] bg-white/80 px-4 py-2.5 text-sm text-slate-600 shadow-[0_10px_24px_rgba(196,181,253,0.08)]">
                            <p>
                              Showing <span className="font-semibold text-slate-900">{filteredRootMessages.length}</span> matching conversation{filteredRootMessages.length === 1 ? "" : "s"} in <span className="font-semibold text-slate-900">{thread.thread.displayName}</span>.
                            </p>
                            <button
                              type="button"
                              onClick={() => setChannelSearchQuery("")}
                              className="text-xs font-semibold text-violet-700 transition hover:text-violet-900"
                            >
                              Clear
                            </button>
                          </div>
                        ) : null}
                        {conversationMode === "conversation" && thread.thread.workOrder ? (
                          <div className="mx-auto mb-6 flex w-full max-w-[1080px] justify-center">
                            <Link
                              href={buildWorkOrderDetailHref(session.userType, thread.thread.workOrder.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-[#e8bfff] bg-[linear-gradient(135deg,#fff7fc_0%,#f2f6ff_100%)] px-4 py-2 text-sm font-semibold text-violet-700 shadow-[0_10px_24px_rgba(196,156,255,0.12)] transition hover:border-[#d9b4ff] hover:bg-[linear-gradient(135deg,#fff2fb_0%,#edf4ff_100%)]"
                            >
                              <ClipboardList className="h-4 w-4" />
                              <span>
                                Open Work Order {thread.thread.workOrder.workOrderNumber}
                              </span>
                            </Link>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {conversationMode === "conversation" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-2">
                         {filteredRootMessages.length === 0 && channelSearchQuery.trim() ? (
                           <div className="rounded-[2rem] border border-dashed border-[#d7c8ff] bg-white/80 px-6 py-12 text-center shadow-[0_16px_30px_rgba(196,181,253,0.08)]">
                             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff0fa_0%,#eef4ff_100%)] text-violet-500">
                               <Search className="h-5 w-5" />
                             </div>
                             <p className="text-base font-semibold text-slate-900">No messages match “{channelSearchQuery.trim()}” in {thread.thread.displayName}</p>
                             <p className="mt-2 text-sm text-slate-500">Try a different keyword, author name, or attachment name inside this conversation.</p>
                           </div>
                         ) : null}
                        {filteredRootMessages.map((item) => (
                           <div
                             key={item.id}
                             id={`message-main-${item.id}`}
                             onMouseEnter={() => focusMessageHover(item.id)}
                             className={cn(
                               "app-animate-in group/message relative space-y-0.5 scroll-mt-28 rounded-2xl transition",
                               highlightedMessageId === item.id ? "bg-violet-50/70 ring-2 ring-violet-200 ring-offset-2 ring-offset-transparent" : "",
                               showMessageMenu === item.id || showMessageEmojiPicker === item.id
                                 ? "z-[180]"
                                 : "z-0 hover:z-20"
                             )}
                           >
                              <div className="flex items-start gap-2">
                                {item.createdByUser?.id ? (
                                  <Link href={`/users/${item.createdByUser.id}`} className="shrink-0">
                                    <PresenceAvatar name={item.createdByUser?.name ?? "User"} avatarUrl={item.createdByUser?.avatarUrl ?? null} isOnline={item.createdByUser?.isOnline ?? false} size="sm" />
                                  </Link>
                                ) : (
                                  <PresenceAvatar name={item.createdByUser?.name ?? "User"} avatarUrl={item.createdByUser?.avatarUrl ?? null} isOnline={item.createdByUser?.isOnline ?? false} size="sm" />
                                )}
                                <div className="relative min-w-0 flex-1">
                                   <div className="group/author mb-0 flex items-center gap-1">
                                    {item.createdByUser?.id ? (
                                      <Link href={`/users/${item.createdByUser.id}`} className="text-sm font-bold text-slate-900 transition hover:text-violet-700">
                                        {item.createdByUser?.name ?? item.authorType}
                                      </Link>
                                    ) : (
                                      <span className="text-sm font-bold text-slate-900">{item.createdByUser?.name ?? item.authorType}</span>
                                    )}
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {item.updatedAt !== item.createdAt && (
                                       <span className="text-[10px] text-slate-400 italic mb-0">(edited)</span>
                                    )}
                                  </div>
                                  {editingMessageId === item.id ? (
                                    <div className="w-full max-w-[880px]">
                                      <textarea
                                        value={editBody}
                                        onChange={(e) => setEditBody(e.target.value)}
                                        onKeyDown={(e) => {
                                           if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(item.id); }
                                           else if (e.key === "Escape") { e.preventDefault(); cancelEditing(); }
                                        }}
                                        className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                        rows={3}
                                      />
                                      <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-medium pl-1 hidden sm:inline-block">Escape to cancel • Enter to save</span>
                                        <div className="flex items-center gap-2">
                                          <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition">Cancel</button>
                                          <button type="button" onClick={() => saveEdit(item.id)} disabled={isSavingEdit || !editBody.trim()} className="inline-flex h-8 w-10 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 shadow-sm transition"><SendHorizontal className="h-4 w-4" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="relative isolate inline-flex max-w-[min(100%,820px)] flex-col items-start">
                                        {renderQuotedMessagePreview(item)}
                                        {(item.messageType === "SYSTEM_EVENT" || getDisplayBody(item)) && (
                                          <div
                                            className={cn(
                                              "inline-block w-full rounded-[1.15rem] px-3 py-1.5 text-[13px] leading-[1.5]",
                                              (messageReactions[item.id]?.length ?? 0) > 0 ? "pr-14" : "",
                                              bubbleTone(item)
                                            )}
                                          >
                                            {item.messageType === "SYSTEM_EVENT" ? (
                                               <span className="italic opacity-70 flex items-center gap-2"><div className="w-1 h-3 rounded bg-slate-300"></div>{item.body}</span>
                                            ) : channelSearchQuery.trim() ? (
                                               <span>{renderHighlightedSearchText(getDisplayBody(item), channelSearchQuery)}</span>
                                            ) : (
                                               <MentionText body={getDisplayBody(item)} mentions={item.mentions} />
                                            )}
                                          </div>
                                        )}
                                        {translatedMessages[item.id] ? (
                                          <div className="mt-1 w-full rounded-[1.15rem] border border-sky-100 bg-sky-50/70 px-3 py-1.5 text-[13px] text-slate-700">
                                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700">Translated to {translatedMessages[item.id].language}</p>
                                            <p>{translatedMessages[item.id].body}</p>
                                          </div>
                                        ) : null}
                                        {renderMessageAttachments(item.attachments)}
                                        {(messageReactions[item.id]?.length ?? 0) > 0 ? (
                                          <div className="pointer-events-none absolute bottom-1 right-2 z-10 flex max-w-[45%] justify-end">
                                            <div className="pointer-events-auto inline-flex flex-wrap items-center justify-end gap-1 rounded-full bg-white/95 px-1 py-0.5 shadow-[0_8px_18px_rgba(184,175,223,0.16)] ring-1 ring-[#ece2ff]">
                                              {(messageReactions[item.id] ?? []).map((emoji) => (
                                                <button
                                                  key={`${item.id}-${emoji}`}
                                                  type="button"
                                                  onClick={() => toggleMessageReaction(item.id, emoji)}
                                                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-50 px-1 text-[12px] transition hover:bg-slate-100"
                                                  title={`Remove ${emoji} reaction`}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        ) : null}
                                        {item.messageType !== "SYSTEM_EVENT" ? (
                                          <div
                                            className={cn(
                                              "absolute right-0 top-0 z-[100] flex w-max max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-[0_14px_30px_rgba(184,175,223,0.26)] ring-1 ring-[#ece2ff] transition -translate-y-[calc(100%+0.25rem)] isolate before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-white before:content-[''] [&>*]:relative [&>*]:z-10",
                                              showMessageMenu === item.id || showMessageEmojiPicker === item.id
                                                ? "pointer-events-auto opacity-100"
                                                : "pointer-events-none opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100"
                                            )}
                                          >
                                            <div className="relative">
                                              <button
                                                onClick={() => setShowMessageEmojiPicker(showMessageEmojiPicker === item.id ? null : item.id)}
                                                className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                                                title="Emoji"
                                              >
                                                <SmilePlus className="h-3.5 w-3.5" />
                                              </button>
                                              {showMessageEmojiPicker === item.id ? (
                                                <div className="absolute bottom-full right-0 z-[140] mb-2 flex items-center gap-1 rounded-2xl border border-white bg-white px-2 py-2 shadow-[0_18px_40px_rgba(148,163,184,0.24)] ring-1 ring-slate-200">
                                                  {["👍", "❤️", "😂"].map((emoji) => (
                                                    <button
                                                      key={emoji}
                                                      type="button"
                                                      onClick={() => {
                                                        toggleMessageReaction(item.id, emoji);
                                                        setShowMessageEmojiPicker(null);
                                                      }}
                                                      className="rounded-xl p-1.5 text-lg transition hover:bg-slate-100"
                                                    >
                                                      {emoji}
                                                    </button>
                                                  ))}
                                                </div>
                                              ) : null}
                                            </div>
                                            <button
                                              onClick={() => setReplyTo(item)}
                                              className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-fuchsia-50 hover:text-fuchsia-600"
                                              title="Reply"
                                            >
                                              <MessageCircleReply className="h-3.5 w-3.5" />
                                            </button>
                                            {item.createdByUser?.id && item.createdByUser.id !== session.id ? (
                                              <button
                                                onClick={() => void openDirectMessage(item.createdByUser!.id)}
                                                className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
                                                title={`Message ${item.createdByUser?.name ?? "user"}`}
                                              >
                                                <MessageCircle className="h-3.5 w-3.5" />
                                              </button>
                                            ) : null}
                                            <button
                                              onClick={() => void toggleMessageMeta(item.id, "pin", !item.isPinned)}
                                              className={cn(
                                                "rounded-full bg-white p-1.5 transition",
                                                item.isPinned
                                                  ? "text-amber-600 hover:bg-amber-50"
                                                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                              )}
                                              title="Pin"
                                            >
                                              <Pin className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              onClick={() => void translateMessage(item.id)}
                                              className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
                                              title="Translate to Bangla"
                                            >
                                              <Sparkles className="h-3.5 w-3.5" />
                                            </button>
                                            {canManageThreadMessage(session, item) ? (
                                              <>
                                                <button
                                                  onClick={() => {
                                                    setShowMessageMenu(null);
                                                    setShowMessageEmojiPicker(null);
                                                    startEditing(item);
                                                  }}
                                                  className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-fuchsia-50 hover:text-fuchsia-600"
                                                  title="Edit message"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setShowMessageMenu(null);
                                                    setShowMessageEmojiPicker(null);
                                                    void deleteMessage(item.id);
                                                  }}
                                                  className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                                                  title="Delete message"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </>
                                            ) : null}
                                            <div className="relative">
                                              <button
                                                onClick={() => {
                                                  setShowMessageEmojiPicker(null);
                                                  setShowMessageMenu(showMessageMenu === item.id ? null : item.id);
                                                }}
                                                className="rounded-full bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                                title="More"
                                              >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                              </button>
                                              {showMessageMenu === item.id && (
                                                <div className="absolute right-0 top-full z-[220] mt-2 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-200">
                                                   <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setQuotingMessage(item); setShowMessageMenu(null); setShowMessageEmojiPicker(null); window.setTimeout(() => composerRef.current?.focus(), 0); }}>
                                                       <Quote className="h-4 w-4" /> Quote in reply
                                                   </button>
                                                   <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => setShowMessageMenu(null)}>
                                                       <Check className="h-4 w-4" /> Mark as unread
                                                   </button>
                                                   <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowMessageMenu(null); }}>
                                                       <Link2 className="h-4 w-4" /> Copy message link
                                                   </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </>
                                  )}
                                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    {item.messageType !== "SYSTEM_EVENT" ? (
                                      <>
                                        {item.expiresAt ? <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600">Auto delete {new Date(item.expiresAt).toLocaleString()}</span> : null}
                                        {(repliesByParent.get(item.id)?.length ?? 0) > 0 && (
                                          <button onClick={() => setReplyTo(item)} className="rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-bold text-fuchsia-500 transition">{(repliesByParent.get(item.id)?.length ?? 0)} Replies</button>
                                        )}
                                      </>
                                    ) : (
                                       <>
                                        {(repliesByParent.get(item.id)?.length ?? 0) > 0 && (
                                           <button onClick={() => setReplyTo(item)} className="rounded-full bg-fuchsia-50 px-2 py-1 text-[10px] font-bold text-fuchsia-500 transition">{(repliesByParent.get(item.id)?.length ?? 0)} Replies</button>
                                        )}
                                       </>
                                    )}
                                  </div>
                                </div>
                              </div>
                           </div>
                         ))}
                       </div>
                    ) : conversationMode === "files" ? (
                       <div className="mx-auto grid w-full max-w-[1080px] grid-cols-2 gap-4 md:grid-cols-3">
                          {threadAttachments.map((file) => (
                             <div key={file.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm aspect-square flex flex-col gap-2 text-center">
                                <div className="relative flex-1">
                                  {file.isImage ? (
                                    <button
                                      type="button"
                                      onClick={() => openImageAttachmentViewer(threadAttachments, file.id)}
                                      className="h-full w-full overflow-hidden rounded-xl"
                                    >
                                      <img src={`/messages/attachments/${file.id}?preview=1`} alt={file.fileName} className="h-full w-full object-cover rounded-xl" />
                                    </button>
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50">
                                      <FolderOpen className="h-8 w-8 text-sky-500" />
                                    </div>
                                  )}
                                  {(file.versionCount ?? 1) > 1 ? (
                                    <span className="absolute right-2 top-2 rounded-full border border-violet-200 bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shadow-sm">
                                      v{file.versionCount}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="space-y-1">
                                  <p className="w-full truncate text-xs font-semibold text-slate-800">{file.fileName}</p>
                                  <div className="flex items-center justify-center gap-2">
                                    <a
                                      href={getMessageAttachmentHref(file.id)}
                                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      Download
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setOpenAttachmentVersions(file)}
                                      className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100"
                                    >
                                      Versions
                                    </button>
                                  </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : conversationMode === "tasks" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="font-bold text-slate-900 border-b-2 border-sky-500 pb-1">Space Tasks ({spaceTasks.length})</h3>
                          </div>
                          {spaceTasks.length === 0 ? (
                             <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
                                No active tasks in this workspace. Create one from the composer using the Checksquare icon.
                             </div>
                          ) : (
                             <div className="grid gap-3">
                                {spaceTasks.map(task => (
                                   <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-start gap-4">
                                      <div className="pt-1">
                                         <CheckSquare className={cn("h-5 w-5", task.status === "DONE" || task.status === "APPROVED" ? "text-emerald-500" : "text-sky-500")} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                         <p className="text-sm font-bold text-slate-900">{task.title}</p>
                                         {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
                                         <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                                               <UserAvatar name={task.assignedToUser.name} avatarUrl={task.assignedToUser.avatarUrl} size="sm" />
                                               <span className="truncate max-w-[100px]">{task.assignedToUser.name}</span>
                                            </div>
                                            {task.dueAt && (
                                               <span className={cn(new Date(task.dueAt) < new Date() && task.status !== "DONE" && task.status !== "APPROVED" ? "text-rose-500" : "")}>
                                                  Due: {new Date(task.dueAt).toLocaleDateString()}
                                               </span>
                                            )}
                                            <span className={cn(
                                               "px-2 py-0.5 rounded-full border", 
                                               task.status === "OPEN" ? "bg-amber-50 text-amber-600 border-amber-200" : 
                                               task.status === "DONE" ? "bg-sky-50 text-sky-600 border-sky-200" : 
                                               "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            )}>{task.status}</span>
                                         </div>
                                      </div>
                                      {(task.assignedToUser.id === session.id && task.status === "OPEN") && (
                                         <button onClick={() => updateSpaceTask(task.id, "done")} className="rounded-xl bg-sky-50 text-sky-700 px-4 py-2 text-xs font-bold hover:bg-sky-100 transition shadow-sm border border-sky-100">
                                            MARK DONE
                                         </button>
                                      )}
                                      {(canAdminApproveSpaceTask(session) && task.status === "DONE") && (
                                         <button onClick={() => updateSpaceTask(task.id, "approve")} className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-2 text-xs font-bold hover:bg-emerald-100 transition shadow-sm border border-emerald-100">
                                            APPROVE
                                         </button>
                                      )}
                                   </div>
                                ))}
                             </div>
                          )}
                       </div>
                    ) : conversationMode === "wiki" ? (
                       <div className="mx-auto grid w-full max-w-[1080px] gap-4 xl:grid-cols-[260px_1fr]">
                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900">Knowledge Base / Wiki</h3>
                                <button type="button" onClick={beginNewNote} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50">
                                  <Plus className="h-3.5 w-3.5" />
                                  New
                                </button>
                             </div>
                             {sharedNotes.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                  No wiki pages yet. Start one for team context, field instructions, or client guidance.
                                </div>
                             ) : (
                                <div className="space-y-2">
                                   {sharedNotes.map((note) => (
                                      <button
                                        key={note.id}
                                        type="button"
                                        onClick={() => openNoteForEditing(note)}
                                        className={cn(
                                          "w-full rounded-2xl border px-4 py-3 text-left transition",
                                          note.id === activeEditingNote?.id ? "border-violet-200 bg-white shadow-sm" : "border-slate-200 bg-white/70 hover:bg-white"
                                        )}
                                      >
                                        <p className="truncate text-sm font-semibold text-slate-900">{note.title}</p>
                                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{note.body}</p>
                                      </button>
                                   ))}
                                </div>
                             )}
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                             <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                   <h3 className="text-lg font-bold text-slate-900">{editingNoteId ? "Edit wiki page" : "Create wiki page"}</h3>
                                   <p className="mt-1 text-sm text-slate-500">Keep one editable knowledge page inside the chat for SOPs, context, and reusable operations guidance.</p>
                                </div>
                                {activeEditingNote?.updatedByUser ? (
                                  <div className="hidden rounded-2xl bg-slate-50 px-3 py-2 text-right text-xs text-slate-500 sm:block">
                                    <p className="font-semibold text-slate-700">{activeEditingNote.updatedByUser.name}</p>
                                    <p>{new Date(activeEditingNote.updatedAt).toLocaleString()}</p>
                                  </div>
                                ) : null}
                             </div>
                             <div className="mt-4 space-y-4">
                                <input value={noteTitleDraft} onChange={(event) => setNoteTitleDraft(event.target.value)} placeholder="Wiki page title" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400" />
                                <textarea value={noteBodyDraft} onChange={(event) => setNoteBodyDraft(event.target.value)} placeholder="Write shared instructions, glossary notes, SOPs, or a working document here..." rows={16} className="w-full resize-y rounded-3xl border border-slate-200 px-4 py-4 text-sm leading-7 text-slate-800 outline-none focus:border-violet-400" />
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs text-slate-400">Everyone in this thread sees the same evolving knowledge page.</p>
                                  <button type="button" onClick={() => void saveSharedNote()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                    <FileText className="h-4 w-4" />
                                    Save page
                                  </button>
                                </div>
                             </div>
                          </div>
                       </div>
                    ) : conversationMode === "polls" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="flex items-center justify-between">
                             <div>
                                <h3 className="text-lg font-bold text-slate-900">Polls & quick surveys</h3>
                                <p className="mt-1 text-sm text-slate-500">Run fast votes for approvals, field decisions, and team alignment.</p>
                             </div>
                             <button type="button" onClick={() => setCreatingPoll((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                               <Plus className="h-4 w-4" />
                               {creatingPoll ? "Close" : "New poll"}
                             </button>
                          </div>
                          {creatingPoll ? (
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="grid gap-4 md:grid-cols-2">
                                <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Poll question" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 md:col-span-2" />
                                <textarea value={pollDescription} onChange={(event) => setPollDescription(event.target.value)} placeholder="Optional poll context" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 md:col-span-2" />
                                <textarea value={pollOptionsDraft} onChange={(event) => setPollOptionsDraft(event.target.value)} placeholder={"One option per line\nYes\nNo"} rows={6} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400" />
                                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <input type="checkbox" checked={pollAllowsMultiple} onChange={(event) => setPollAllowsMultiple(event.target.checked)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                                    Allow multiple choices
                                  </label>
                                  <input type="datetime-local" value={pollClosesAt} onChange={(event) => setPollClosesAt(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                  <button type="button" onClick={() => void createPoll()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                    <BarChart3 className="h-4 w-4" />
                                    Create poll
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {polls.length === 0 ? (
                             <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No polls yet. Start one to collect fast decisions.</div>
                          ) : (
                             <div className="space-y-4">
                               {polls.map((poll) => {
                                 const userVotes = poll.options.filter((option) => option.votes.some((vote) => vote.userId === session.id)).map((option) => option.id);
                                 return (
                                   <div key={poll.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                     <div className="flex items-start justify-between gap-3">
                                       <div>
                                         <h4 className="text-base font-bold text-slate-900">{poll.question}</h4>
                                         {poll.description ? <p className="mt-1 text-sm text-slate-500">{poll.description}</p> : null}
                                         <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                           {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"} • {poll.allowsMultiple ? "Multiple choice" : "Single choice"}
                                         </p>
                                       </div>
                                       <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">{poll.createdByUser?.name ?? "Team poll"}</div>
                                     </div>
                                     <div className="mt-4 space-y-3">
                                       {poll.options.map((option) => {
                                         const count = option.votes.length;
                                         const percent = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                                         const selected = userVotes.includes(option.id);
                                         return (
                                           <button
                                             key={option.id}
                                             type="button"
                                             disabled={Boolean(submittingPollVotes[poll.id])}
                                             onClick={() => void submitPollVote(poll.id, poll.allowsMultiple ? (selected ? userVotes.filter((id) => id !== option.id) : [...userVotes, option.id]) : [option.id])}
                                             className={cn("w-full overflow-hidden rounded-2xl border text-left transition", selected ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50/70 hover:bg-white")}
                                           >
                                             <div className="flex items-center justify-between gap-3 px-4 py-3">
                                               <span className="text-sm font-semibold text-slate-800">{option.label}</span>
                                               <span className="text-xs font-semibold text-slate-500">{count} • {percent}%</span>
                                             </div>
                                             <div className="h-2 w-full bg-white">
                                               <div className="h-full bg-[linear-gradient(90deg,#f8cfe8_0%,#cda8ff_50%,#88b0ff_100%)]" style={{ width: `${percent}%` }} />
                                             </div>
                                           </button>
                                         );
                                       })}
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                          )}
                       </div>
                    ) : conversationMode === "meetings" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="flex items-center justify-between">
                             <div>
                                <h3 className="text-lg font-bold text-slate-900">Calendar & meetings</h3>
                                <p className="mt-1 text-sm text-slate-500">Schedule check-ins and keep the meeting details tied to the thread.</p>
                             </div>
                             <button type="button" onClick={() => setCreatingMeeting((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                               <Plus className="h-4 w-4" />
                               {creatingMeeting ? "Close" : "Schedule"}
                             </button>
                          </div>
                          {creatingMeeting ? (
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="grid gap-4 md:grid-cols-2">
                                <input value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} placeholder="Meeting title" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400" />
                                <input value={meetingLocation} onChange={(event) => setMeetingLocation(event.target.value)} placeholder="Location or site" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                <input type="datetime-local" value={meetingStartsAt} onChange={(event) => setMeetingStartsAt(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                <input type="datetime-local" value={meetingEndsAt} onChange={(event) => setMeetingEndsAt(event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                <input value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="Meeting link (Meet, Zoom, Teams, etc.)" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400 md:col-span-2" />
                                <textarea value={meetingDescription} onChange={(event) => setMeetingDescription(event.target.value)} placeholder="Agenda or meeting details" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 md:col-span-2" />
                              </div>
                              <div className="mt-4 flex justify-end">
                                <button type="button" onClick={() => void scheduleMeeting()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                  <CalendarDays className="h-4 w-4" />
                                  Schedule meeting
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {meetings.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No meetings scheduled in this thread yet.</div>
                          ) : (
                            <div className="space-y-4">
                              {meetings.map((meeting) => (
                                <div key={meeting.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                      <h4 className="text-base font-bold text-slate-900">{meeting.title}</h4>
                                      {meeting.description ? <p className="mt-1 text-sm text-slate-500">{meeting.description}</p> : null}
                                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-500" /><span>{new Date(meeting.startsAt).toLocaleString()} to {new Date(meeting.endsAt).toLocaleString()}</span></div>
                                        {meeting.location ? <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-500" /><span>{meeting.location}</span></div> : null}
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      {meeting.meetingUrl ? <a href={meeting.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"><Video className="h-4 w-4" />Join</a> : null}
                                      <a href={buildGoogleCalendarHref(meeting)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"><CalendarDays className="h-4 w-4" />Add to Calendar</a>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                    ) : conversationMode === "bots" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="flex items-center justify-between">
                             <div>
                                <h3 className="text-lg font-bold text-slate-900">Bots, reminders & assistants</h3>
                                <p className="mt-1 text-sm text-slate-500">Set up reminder bots, workflow helpers, and AI assistant prompts for this thread.</p>
                             </div>
                             <div className="flex items-center gap-2">
                               <button
                                 type="button"
                                 onClick={() => {
                                   setCreatingBot(true);
                                   setBotName("Gemini Flash Assistant");
                                   setBotType("AI_ASSISTANT");
                                   setBotDescription("Gemini-powered assistant for thread Q&A, summaries, and next-step help.");
                                   setBotPrompt("Use Gemini to answer questions about this thread, summarize recent updates, identify owners and blockers, and suggest next steps in a concise operational style.");
                                   setBotCadenceMinutes("0");
                                 }}
                                 className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100"
                               >
                                 <Sparkles className="h-4 w-4" />
                                 Gemini bot
                               </button>
                               <button type="button" onClick={() => setCreatingBot((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                                 <Plus className="h-4 w-4" />
                                 {creatingBot ? "Close" : "New bot"}
                               </button>
                             </div>
                          </div>
                          {creatingBot ? (
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                              <div className="grid gap-4 md:grid-cols-2">
                                <input value={botName} onChange={(event) => setBotName(event.target.value)} placeholder="Bot name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400" />
                                <select value={botType} onChange={(event) => setBotType(event.target.value as "REMINDER" | "WORKFLOW" | "AI_ASSISTANT")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400">
                                  <option value="REMINDER">Reminder bot</option>
                                  <option value="WORKFLOW">Workflow bot</option>
                                  <option value="AI_ASSISTANT">AI assistant (Gemini)</option>
                                </select>
                                <input value={botCadenceMinutes} onChange={(event) => setBotCadenceMinutes(event.target.value)} placeholder="Cadence in minutes" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                <input value={botDescription} onChange={(event) => setBotDescription(event.target.value)} placeholder="Short description" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                <textarea value={botPrompt} onChange={(event) => setBotPrompt(event.target.value)} placeholder="Prompt or workflow instructions" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400 md:col-span-2" />
                              </div>
                              <div className="mt-4 flex justify-end">
                                <button type="button" onClick={() => void createBot()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                  <Bot className="h-4 w-4" />
                                  Save bot
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {bots.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No bots configured for this thread yet.</div>
                          ) : (
                            <div className="grid gap-4">
                              {bots.map((bot) => (
                                <div key={bot.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-violet-600" />
                                        <h4 className="text-base font-bold text-slate-900">{bot.name}</h4>
                                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{bot.botType.replaceAll("_", " ")}</span>
                                      </div>
                                      {bot.description ? <p className="mt-2 text-sm text-slate-500">{bot.description}</p> : null}
                                      {bot.prompt ? <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">{bot.prompt}</p> : null}
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                      <p className="font-semibold text-slate-700">{bot.enabled ? "Enabled" : "Disabled"}</p>
                                      {bot.nextRunAt ? <p>Next run {new Date(bot.nextRunAt).toLocaleString()}</p> : null}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                    ) : conversationMode === "apps" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-6">
                          <div className="grid gap-6 xl:grid-cols-2">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">Tool integrations</h3>
                                  <p className="mt-1 text-sm text-slate-500">Track GitHub, Jira, Notion, or custom tool links at the thread level.</p>
                                </div>
                                <button type="button" onClick={() => setCreatingIntegration((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                                  <Plus className="h-4 w-4" />
                                  {creatingIntegration ? "Close" : "Add"}
                                </button>
                              </div>
                              {creatingIntegration ? (
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                  <div className="grid gap-4">
                                    <select value={integrationType} onChange={(event) => setIntegrationType(event.target.value as "GITHUB" | "JIRA" | "NOTION" | "GENERIC")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400">
                                      <option value="GITHUB">GitHub</option>
                                      <option value="JIRA">Jira</option>
                                      <option value="NOTION">Notion</option>
                                      <option value="GENERIC">Generic</option>
                                    </select>
                                    <input value={integrationName} onChange={(event) => setIntegrationName(event.target.value)} placeholder="Integration name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <input value={integrationUrl} onChange={(event) => setIntegrationUrl(event.target.value)} placeholder="Workspace or project URL" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <input value={integrationProjectKey} onChange={(event) => setIntegrationProjectKey(event.target.value)} placeholder="Project key / repo / page id" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <textarea value={integrationConfig} onChange={(event) => setIntegrationConfig(event.target.value)} placeholder='Optional config JSON, labels, or workflow mapping' rows={3} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-violet-400" />
                                    <div className="flex justify-end">
                                      <button type="button" onClick={() => void createIntegration()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                        <PlugZap className="h-4 w-4" />
                                        Save integration
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              <div className="space-y-3">
                                {integrations.length === 0 ? (
                                  <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No integrations added yet.</div>
                                ) : integrations.map((integration) => (
                                  <div key={integration.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <h4 className="text-base font-bold text-slate-900">{integration.displayName}</h4>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{integration.integrationType}</p>
                                      </div>
                                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">{integration.enabled ? "Enabled" : "Disabled"}</span>
                                    </div>
                                    {integration.workspaceUrl ? <a href={integration.workspaceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-sm text-sky-700 underline">{integration.workspaceUrl}</a> : null}
                                    {integration.projectKey ? <p className="mt-2 text-sm text-slate-500">Key: {integration.projectKey}</p> : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900">Webhooks & APIs</h3>
                                  <p className="mt-1 text-sm text-slate-500">Send chat activity into custom workflows whenever thread events happen.</p>
                                </div>
                                <button type="button" onClick={() => setCreatingWebhook((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                                  <Plus className="h-4 w-4" />
                                  {creatingWebhook ? "Close" : "Add"}
                                </button>
                              </div>
                              {creatingWebhook ? (
                                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                  <div className="grid gap-4">
                                    <input value={webhookName} onChange={(event) => setWebhookName(event.target.value)} placeholder="Webhook name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="Target URL" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <input value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} placeholder="Optional shared secret" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                    <div className="flex flex-wrap gap-2">
                                      {["MESSAGE_CREATED", "TASK_CREATED", "TASK_UPDATED", "NOTE_UPDATED", "POLL_CREATED", "MEETING_CREATED"].map((eventName) => {
                                        const selected = webhookEvents.includes(eventName);
                                        return (
                                          <button
                                            key={eventName}
                                            type="button"
                                            onClick={() => setWebhookEvents((current) => selected ? current.filter((item) => item !== eventName) : [...current, eventName])}
                                            className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", selected ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}
                                          >
                                            {eventName}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <div className="flex justify-end">
                                      <button type="button" onClick={() => void createWebhook()} className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95">
                                        <Webhook className="h-4 w-4" />
                                        Save webhook
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              <div className="space-y-3">
                                {webhooks.length === 0 ? (
                                  <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No custom webhooks configured yet.</div>
                                ) : webhooks.map((webhook) => (
                                  <div key={webhook.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <Webhook className="h-4 w-4 text-violet-600" />
                                          <h4 className="text-base font-bold text-slate-900">{webhook.displayName}</h4>
                                        </div>
                                        <p className="mt-2 break-all text-sm text-slate-500">{webhook.targetUrl}</p>
                                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{webhook.subscribedEvents.replaceAll(",", " • ")}</p>
                                      </div>
                                      <div className="text-right text-xs text-slate-500">
                                        <p className="font-semibold text-slate-700">{webhook.enabled ? "Enabled" : "Disabled"}</p>
                                        {webhook.lastStatus ? <p className="mt-1">{webhook.lastStatus}</p> : null}
                                        {webhook.lastTriggeredAt ? <p className="mt-1">Last sent {new Date(webhook.lastTriggeredAt).toLocaleString()}</p> : null}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                       </div>
                    ) : conversationMode === "ai" ? (
                       <div className="mx-auto grid h-full min-h-0 w-full max-w-[1080px] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden pb-4">
                          <div className="shrink-0 rounded-3xl border border-fuchsia-100 bg-[linear-gradient(135deg,rgba(255,247,252,0.96)_0%,rgba(239,245,255,0.96)_100%)] p-5 shadow-sm">
                             <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                   <div className="flex items-center gap-2">
                                      <Sparkles className="h-5 w-5 text-fuchsia-600" />
                                      <h3 className="text-lg font-bold text-slate-900">Helper chat</h3>
                                   </div>
                                   <p className="mt-2 text-sm text-slate-600">
                                      Ask for pricing help, document answers, summaries, ownership, next steps, or a quick explanation in plain language.
                                   </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => assistantComposerRef.current?.focus()}
                                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full border border-fuchsia-200 bg-white px-4 py-2 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50 sm:w-auto"
                                >
                                  <MessageCircleReply className="h-4 w-4" />
                                  Start chat
                                </button>
                             </div>
                          </div>
                          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[2rem] border border-fuchsia-100 bg-white shadow-sm">
                             <div ref={assistantWorkspaceScrollRef} className="min-h-0 overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] p-5">
                                <div className="space-y-5">
                                   <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                         <div className="min-w-0">
                                            <h3 className="text-base font-bold text-slate-900">Latest answer</h3>
                                            <p className="mt-2 text-sm text-slate-500">Your helper result stays in the main workspace while the composer remains pinned at the bottom.</p>
                                         </div>
                                         <button type="button" onClick={() => void loadAiInsights()} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100 sm:w-auto">
                                            <Sparkles className="h-4 w-4" />
                                            {loadingAi ? "Refreshing..." : "Refresh AI"}
                                         </button>
                                      </div>
                                      <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
                                         {assistantError ? (
                                           <p className="break-words text-sm leading-relaxed text-rose-600">{assistantError}</p>
                                         ) : assistantAnswer ? (
                                           <>
                                              <p className="break-words text-sm leading-relaxed text-slate-700">{assistantAnswer.answer}</p>
                                             {assistantAnswer.citations.length > 0 ? (
                                               <p className="mt-2 break-words text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">References: {assistantAnswer.citations.length} message match{assistantAnswer.citations.length === 1 ? "" : "es"}</p>
                                             ) : null}
                                           </>
                                         ) : (
                                           <p className="text-sm text-slate-500">{runningAssistant ? "Working on your answer..." : "Ask a question above to start the helper conversation."}</p>
                                         )}
                                      </div>
                                   </div>
                                   <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                                      <div className="min-w-0 rounded-3xl border border-fuchsia-100 bg-white p-6 shadow-sm">
                                         <div className="flex items-center gap-2">
                                            <Sparkles className="h-5 w-5 text-fuchsia-600" />
                                            <h3 className="text-lg font-bold text-slate-900">AI workspace</h3>
                                         </div>
                                         <p className="mt-2 text-sm text-slate-500">Smart replies, summaries, action items, meeting notes, and natural-language help for this thread.</p>
                                         <div className="mt-5 grid gap-5 lg:grid-cols-2">
                                            <div className="min-w-0 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ff_100%)] p-4">
                                               <h4 className="text-sm font-bold text-slate-900">Smart replies</h4>
                                               <div className="mt-3 flex flex-wrap gap-2">
                                                  {(aiInsights?.smartReplies ?? []).length === 0 ? (
                                                    <p className="text-sm text-slate-500">Open this tab to generate reply suggestions from the latest conversation.</p>
                                                  ) : (
                                                    (aiInsights?.smartReplies ?? []).map((reply, index) => (
                                                      <button
                                                        key={`${reply}-${index}`}
                                                        type="button"
                                                        onClick={() => {
                                                          setComposeBody(reply);
                                                          setConversationMode("conversation");
                                                          window.setTimeout(() => composerRef.current?.focus(), 0);
                                                        }}
                                                        className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-left text-sm font-medium text-violet-800 transition hover:bg-violet-100"
                                                      >
                                                        {reply}
                                                      </button>
                                                    ))
                                                  )}
                                               </div>
                                            </div>
                                            <div className="min-w-0 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ff_100%)] p-4">
                                               <h4 className="text-sm font-bold text-slate-900">Meeting notes & action items</h4>
                                               <div className="mt-3 space-y-3">
                                                  {(aiInsights?.actionItems ?? []).length === 0 ? (
                                                    <p className="text-sm text-slate-500">No action items extracted yet.</p>
                                                  ) : (
                                                    (aiInsights?.actionItems ?? []).slice(0, 5).map((item) => (
                                                      <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                                        <p className="mt-1 text-xs text-slate-500">Owner signal: {item.owner}</p>
                                                      </div>
                                                    ))
                                                  )}
                                               </div>
                                            </div>
                                         </div>
                                         <div className="mt-5 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9f5ff_100%)] p-4">
                                            <h4 className="text-sm font-bold text-slate-900">Thread summary</h4>
                                            <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                                               {(aiInsights?.summary ?? []).length === 0 ? (
                                                 <p>{loadingAi ? "Loading AI summary..." : "No summary generated yet."}</p>
                                               ) : (
                                                 (aiInsights?.summary ?? []).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)
                                               )}
                                            </div>
                                         </div>
                                      </div>
                                      <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                         <h3 className="text-base font-bold text-slate-900">Meeting notes extraction</h3>
                                         <div className="mt-3 space-y-2 text-sm text-slate-600">
                                            {(aiInsights?.meetingNotes ?? []).length === 0 ? (
                                              <p>No meeting-style notes detected yet.</p>
                                            ) : (
                                              (aiInsights?.meetingNotes ?? []).map((line, index) => (
                                                <div key={`${line}-${index}`} className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffefe_0%,#fbf8ff_100%)] px-4 py-3">{line}</div>
                                              ))
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                   <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                      <h3 className="text-base font-bold text-slate-900">Natural language search</h3>
                                      <p className="mt-2 text-sm text-slate-500">Search messages, files, people, and connected Documents-folder references using normal questions such as latest invoice file or who mentioned inspection photos.</p>
                                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                         <input value={aiSearchQuery} onChange={(event) => setAiSearchQuery(event.target.value)} placeholder="Find the latest file from Emma or who asked for a follow-up..." className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                         <button type="button" onClick={() => void runAiSearch()} className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 sm:min-w-[124px]">
                                            {runningAiSearch ? "Searching..." : "Search"}
                                         </button>
                                      </div>
                                      <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1">
                                         <div className="space-y-4 pb-1">
                                            <div>
                                               <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Messages</p>
                                               <div className="mt-2 space-y-2">
                                                  {aiSearchResults.messages.length === 0 ? <p className="text-sm text-slate-500">No message matches yet.</p> : aiSearchResults.messages.map((item) => (
                                                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                      <p className="text-sm font-semibold text-slate-900">{item.author}</p>
                                                      <p className="mt-1 break-words text-sm text-slate-600">{item.body}</p>
                                                    </div>
                                                  ))}
                                               </div>
                                            </div>
                                            <div>
                                               <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Files</p>
                                               <div className="mt-2 space-y-2">
                                                  {aiSearchResults.files.length === 0 ? <p className="text-sm text-slate-500">No file matches yet.</p> : aiSearchResults.files.map((item) => (
                                                    <div key={item.id} className="break-words rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700">{item.fileName}</div>
                                                  ))}
                                               </div>
                                            </div>
                                            <div>
                                               <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Users</p>
                                               <div className="mt-2 space-y-2">
                                                  {aiSearchResults.users.length === 0 ? <p className="text-sm text-slate-500">No user matches yet.</p> : aiSearchResults.users.map((item) => (
                                                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                      {item.roleName ? <p className="mt-1 text-xs text-slate-500">{item.roleName}</p> : null}
                                                    </div>
                                                  ))}
                                               </div>
                                            </div>
                                            <div>
                                               <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Documents Folder</p>
                                               <div className="mt-2 space-y-2">
                                                  {aiSearchResults.documents.length === 0 ? <p className="text-sm text-slate-500">No Documents-folder matches yet.</p> : aiSearchResults.documents.map((item) => (
                                                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                      <p className="text-sm font-semibold text-slate-900">{item.fileName}</p>
                                                      <p className="mt-1 break-all text-xs text-slate-500">{item.filePath}</p>
                                                      {item.excerpt ? <p className="mt-2 break-words text-sm text-slate-600">{item.excerpt}</p> : null}
                                                    </div>
                                                  ))}
                                               </div>
                                            </div>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             <div className="border-t border-fuchsia-100 bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ff_100%)] p-4 sm:p-5">
                                <div className="mx-auto w-full max-w-[960px]">
                                   <div className="flex items-center gap-2">
                                      <Sparkles className="h-5 w-5 text-fuchsia-600" />
                                      <h3 className="text-lg font-bold text-slate-900">Ask the helper</h3>
                                   </div>
                                   <p className="mt-2 text-sm text-slate-500">The helper composer stays docked below the cards, so the workspace above always remains scrollable.</p>
                                   <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbf7ff_100%)] p-4 shadow-sm sm:p-5">
                                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                         <div className="min-w-0 flex-1 rounded-[1.5rem] border border-slate-200 bg-white/80 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                                            <textarea
                                              ref={assistantComposerRef}
                                              value={assistantPrompt}
                                              onChange={(event) => setAssistantPrompt(event.target.value)}
                                              onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                  event.preventDefault();
                                                  void runAssistantPrompt();
                                                }
                                              }}
                                              placeholder="Ask Helper anything about this thread, pricing, files, or next steps..."
                                              rows={3}
                                              className="max-h-[18vh] min-h-[88px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-base text-slate-900 outline-none placeholder:text-slate-400 sm:max-h-[22vh] sm:min-h-[96px]"
                                            />
                                         </div>
                                         <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                                            <button
                                              type="button"
                                              onClick={() => void runAssistantPrompt()}
                                              disabled={runningAssistant || !assistantPrompt.trim()}
                                              className="inline-flex h-12 w-full min-w-[148px] items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-5 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                              aria-label="Send message to helper"
                                            >
                                              {runningAssistant ? <Sparkles className="h-4 w-4 animate-pulse" /> : <SendHorizontal className="h-4 w-4" />}
                                              {runningAssistant ? "Thinking..." : "Ask helper"}
                                            </button>
                                            <p className="text-xs text-slate-400 sm:text-right">Press Enter to send, Shift+Enter for a new line</p>
                                         </div>
                                      </div>
                                    </div>
                                 </div>
                              </div>
                              {false && (
                                <div className="max-h-[26rem] overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:max-h-[30rem]">
                                   <h3 className="text-base font-bold text-slate-900">Natural language search</h3>
                                   <p className="mt-2 text-sm text-slate-500">Search messages, files, people, and connected Documents-folder references using normal questions like “latest invoice file” or “who mentioned inspection photos”.</p>
                                   <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                      <input value={aiSearchQuery} onChange={(event) => setAiSearchQuery(event.target.value)} placeholder="Find the latest file from Emma or who asked for a follow-up..." className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400" />
                                      <button type="button" onClick={() => void runAiSearch()} className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 sm:min-w-[124px]">
                                         {runningAiSearch ? "Searching..." : "Search"}
                                      </button>
                                   </div>
                                   <div className="mt-4 max-h-[17.5rem] overflow-y-auto pr-1 sm:max-h-[21rem]">
                                      <div className="space-y-4 pb-1">
                                      <div>
                                         <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Messages</p>
                                         <div className="mt-2 space-y-2">
                                            {aiSearchResults.messages.length === 0 ? <p className="text-sm text-slate-500">No message matches yet.</p> : aiSearchResults.messages.map((item) => (
                                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                <p className="text-sm font-semibold text-slate-900">{item.author}</p>
                                                <p className="mt-1 break-words text-sm text-slate-600">{item.body}</p>
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                      <div>
                                         <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Files</p>
                                         <div className="mt-2 space-y-2">
                                            {aiSearchResults.files.length === 0 ? <p className="text-sm text-slate-500">No file matches yet.</p> : aiSearchResults.files.map((item) => (
                                              <div key={item.id} className="break-words rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700">{item.fileName}</div>
                                            ))}
                                         </div>
                                      </div>
                                      <div>
                                         <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Users</p>
                                         <div className="mt-2 space-y-2">
                                            {aiSearchResults.users.length === 0 ? <p className="text-sm text-slate-500">No user matches yet.</p> : aiSearchResults.users.map((item) => (
                                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                                                {item.roleName ? <p className="mt-1 text-xs text-slate-500">{item.roleName}</p> : null}
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                      <div>
                                         <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Documents Folder</p>
                                         <div className="mt-2 space-y-2">
                                            {aiSearchResults.documents.length === 0 ? <p className="text-sm text-slate-500">No Documents-folder matches yet.</p> : aiSearchResults.documents.map((item) => (
                                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                                                <p className="text-sm font-semibold text-slate-900">{item.fileName}</p>
                                                <p className="mt-1 break-all text-xs text-slate-500">{item.filePath}</p>
                                                {item.excerpt ? <p className="mt-2 break-words text-sm text-slate-600">{item.excerpt}</p> : null}
                                              </div>
                                            ))}
                                         </div>
                                      </div>
                                      </div>
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    ) : conversationMode === "pinned" ? (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="font-bold text-slate-900 border-b-2 border-amber-500 pb-1">Pinned Messages</h3>
                          </div>
                          {timeline.filter(m => m.isPinned).length === 0 ? (
                             <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
                                No pinned messages in this channel.
                             </div>
                          ) : (
                             <div className="space-y-4">
                                {timeline.filter(m => m.isPinned).map(item => (
                                   <div key={item.id} className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <UserAvatar name={item.createdByUser?.name ?? "User"} avatarUrl={item.createdByUser?.avatarUrl ?? null} size="sm" />
                                        <span className="text-xs font-bold text-slate-900">{item.createdByUser?.name}</span>
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(item.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <div className="text-sm text-slate-700 bg-white border border-slate-100 rounded-xl px-4 py-3">
                                         {item.messageType === "SYSTEM_EVENT" ? (
                                            <span className="italic opacity-80">{item.body}</span>
                                         ) : (
                                            <MentionText body={item.body} mentions={item.mentions} />
                                         )}
                                      </div>
                                      <div className="flex justify-end mt-1">
                                         <button onClick={() => setReplyTo(item)} className="text-[10px] font-bold text-slate-400 hover:text-fuchsia-600 transition">GO TO MESSAGE</button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="mx-auto w-full max-w-[1080px] space-y-4">
                          <div className="rounded-3xl border border-fuchsia-100 bg-white p-7 shadow-sm">
                             <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="h-5 w-5 text-fuchsia-600" />
                                <h3 className="font-bold text-slate-900">AI Catch-up Summary</h3>
                             </div>
                             <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                               {aiSummary.map((line, i) => <p key={i}>{line}</p>)}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>

                 {/* Composer */}
	                 {conversationMode !== "ai" ? (
	                 <div
                    ref={mainComposerShellRef}
                    className="absolute inset-x-0 bottom-0 z-20 max-h-[calc(100%-1rem)] shrink-0 overflow-y-auto overscroll-contain border-t border-[#ebe5ff] bg-[linear-gradient(180deg,rgba(255,254,254,0.94)_0%,rgba(248,244,255,0.97)_100%)] p-5 shadow-[0_-16px_42px_-28px_rgba(139,92,246,0.28)] backdrop-blur-sm"
                    style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                  >
                    <div className="mx-auto w-full max-w-[1080px]">
                    <div
                      className={cn(
                        "relative rounded-[1.75rem] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#fbf7ff_100%)] p-2 shadow-[0_12px_28px_rgba(196,186,255,0.16)] focus-within:ring-2 focus-within:ring-violet-200 transition-all",
                        dragTarget === "main"
                          ? "border-violet-300 bg-[linear-gradient(180deg,#fff8fe_0%,#f4f7ff_100%)] ring-2 ring-violet-200"
                          : ""
                      )}
                      onDragOver={(event) => handleComposerDragOver(event, "main")}
                      onDragLeave={(event) => handleComposerDragLeave(event, "main")}
                      onDrop={(event) => handleComposerDrop(event, "main")}
                    >
                        {dragTarget === "main" && (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.5rem] border-2 border-dashed border-violet-300 bg-white/80">
                            <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                              Drop files to attach
                            </p>
                          </div>
                        )}
                        {showTaskPopover && (
                          <div className="absolute bottom-full left-0 mb-3 w-[22rem] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in zoom-in-95">
                             <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <h4 className="text-sm font-bold text-slate-800">Create Task</h4>
                                <button type="button" onClick={() => setShowTaskPopover(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"><X className="h-4 w-4" /></button>
                             </div>
                             <div className="space-y-3">
                                <div>
                                   <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task Title..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                   <select value={taskAssigneeId} onChange={(e) => setTaskAssigneeId(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                                      <option value="" disabled style={{ color: "#94a3b8", backgroundColor: "#ffffff" }}>Assign to...</option>
                                      {members.map(m => <option key={m.id} value={m.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>{m.name}</option>)}
                                   </select>
                                   <input type="date" value={taskDueAt} onChange={(e) => setTaskDueAt(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500" />
                                </div>
                                <div>
                                   <textarea value={taskChecklist} onChange={(e) => setTaskChecklist(e.target.value)} placeholder="Task details or checklist..." rows={2} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500" />
                                </div>
                                <div className="flex justify-end pt-2 border-t border-slate-50 mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!taskTitle.trim() || !taskAssigneeId) {
                                        setNotice("Task Title and Assignee are required.");
                                        return;
                                      }
                                      handleSend(null, composeBody, composeFiles, composeCloudAttachments, composeMentionIds, quotingMessage, () => {
                                        setComposeBody("");
                                        setComposeFiles(null);
                                        setComposeCloudAttachments([]);
                                        setQuotingMessage(null);
                                        if (composerRef.current) composerRef.current.style.height = 'auto';
                                      });
                                    }}
                                    disabled={sending}
                                    className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold tracking-wide text-white shadow-sm hover:bg-sky-600 transition disabled:opacity-50"
                                  >
                                    CREATE TASK
                                  </button>
                                </div>
                             </div>
                          </div>
                        )}
                        <div className="mx-auto w-full max-w-[1080px]">
{mentionTarget === "main" && mentionQuery !== null && mentionSuggestions.length > 0 && (
                          <div className="absolute bottom-full left-4 mb-2 w-64 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                            {mentionSuggestions.map((suggestion, i) => (
                              <button
                                key={suggestion.id}
                                className={cn(
                                  "w-full px-4 py-2 text-left flex items-center gap-3 transition",
                                  i === selectedMentionIndex ? "bg-violet-50 text-violet-900" : "hover:bg-slate-50 text-slate-700"
                                )}
onClick={() => {
  const before = composeBody.slice(0, mentionAnchorIndex);
  const after = composeBody.slice(mentionAnchorIndex + mentionQuery.length + 1);
  setComposeBody(`${before}@${suggestion.name} ${after}`);
  if (!composeMentionIds.includes(suggestion.id)) {
    setComposeMentionIds([...composeMentionIds, suggestion.id]);
  }
  setMentionTarget(null);
  setMentionQuery(null);
  setMentionSuggestions([]);
  composerRef.current?.focus();
}}
                              >
                                <UserAvatar name={suggestion.name} avatarUrl={suggestion.avatarUrl} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-tight">{suggestion.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{suggestion.roleName ?? "Member"}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {quotingMessage && (
                          <div className="px-4 pt-3 pb-2 border-b border-slate-50 bg-slate-50">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-600 mb-1">Quoting {quotingMessage.createdByUser?.name}</p>
                                <p className="text-sm text-slate-600 line-clamp-2">{quotingMessage.body}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setQuotingMessage(null)}
                                className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition"
                                title="Clear quote"
                              >
                                <X className="h-4 w-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Staged file preview strip */}
                        {composeFiles && Array.from(composeFiles).some((file) => file !== voiceDraftFile) && (
                          <div className="flex flex-wrap gap-2 px-4 pt-2">
                            {Array.from(composeFiles).filter((file) => file !== voiceDraftFile).map((file, i) => {
                              const isImage = file.type.startsWith("image/");
                              const previewUrl = isImage ? URL.createObjectURL(file) : null;
                              return (
                                <div key={i} className="group relative flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 shadow-sm">
                                  {isImage && previewUrl ? (
                                    <img src={previewUrl} alt={file.name} className="h-8 w-8 rounded-lg object-cover" onLoad={() => URL.revokeObjectURL(previewUrl)} />
                                  ) : (
                                    <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                  <span className="max-w-[100px] truncate">{file.name}</span>
                                  <button
                                    type="button"
                                    title="Remove"
                                    onClick={() => {
                                      const dt = new DataTransfer();
                                      Array.from(composeFiles).filter((f) => f !== voiceDraftFile).forEach((f, j) => { if (j !== i) dt.items.add(f); });
                                      setComposeFiles(dt.files.length > 0 ? dt.files : null);
                                    }}
                                    className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {composeCloudAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-4 pt-2">
                            {composeCloudAttachments.map((attachment) => (
                              <div key={attachment.id} className="group relative flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 shadow-sm">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span className="font-semibold">{attachment.provider}</span>
                                <span className="max-w-[140px] truncate">{attachment.url}</span>
                                <button
                                  type="button"
                                  title="Remove"
                                  onClick={() => setComposeCloudAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                                  className="ml-0.5 rounded-full p-0.5 text-sky-400 hover:bg-sky-100 hover:text-sky-700 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {isRecordingVoiceMessage ? (
                          <div className="px-4 pt-2">
                            <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-fuchsia-200 bg-[linear-gradient(135deg,rgba(255,247,248,0.99)_0%,rgba(255,238,243,0.98)_38%,rgba(239,246,255,0.98)_100%)] px-4 py-3 shadow-[0_16px_34px_rgba(236,72,153,0.14)]">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fda4af_0%,#f472b6_48%,#60a5fa_100%)] text-white shadow-[0_12px_24px_rgba(244,114,182,0.28)]">
                                  <Mic className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                                    Recording voice note
                                  </div>
                                  <div className="mt-1.5 flex items-end gap-1.5">
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
                                      <span
                                        key={bar}
                                        className="w-1.5 rounded-full bg-gradient-to-t from-fuchsia-500 via-rose-400 to-sky-300 animate-pulse"
                                        style={{ height: (12 + ((bar % 4) + 1) * 5) + 'px', animationDelay: (bar * 90) + 'ms' }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
                                  {formatVoiceRecordingDuration(voiceRecordingElapsedMs)}
                                </span>
                                <button
                                  type="button"
                                  onClick={cancelVoiceMessageRecording}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void toggleVoiceMessageRecording()}
                                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                                  Stop
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {voiceDraftFile && voiceDraftPreviewUrl && !isRecordingVoiceMessage ? (
                          <div className="px-4 pt-2">
                            <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-[#d9d5ff] bg-[linear-gradient(135deg,rgba(255,255,255,0.99)_0%,rgba(249,244,255,0.98)_45%,rgba(239,246,255,0.98)_100%)] px-4 py-3 shadow-[0_14px_32px_rgba(167,139,250,0.12)]">
                              <div className="flex min-w-0 items-center gap-3">
                                <button
                                  type="button"
                                  onClick={toggleVoiceDraftPlayback}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c084fc_0%,#f472b6_50%,#60a5fa_100%)] text-white shadow-[0_14px_26px_rgba(168,85,247,0.25)] transition hover:scale-[1.02]"
                                >
                                  {isPlayingVoiceDraft ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 translate-x-[1px]" />}
                                </button>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">Voice note preview</p>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                                      <span
                                        key={bar}
                                        className={cn(
                                          'w-1.5 rounded-full transition-all duration-200',
                                          isPlayingVoiceDraft ? 'bg-gradient-to-t from-violet-500 via-fuchsia-400 to-sky-300 animate-pulse' : 'bg-slate-200'
                                        )}
                                        style={{ height: (10 + ((bar % 3) + 1) * 5) + 'px', animationDelay: (bar * 100) + 'ms' }}
                                      />
                                    ))}
                                  </div>
                                  <p className="mt-1 text-xs font-medium text-slate-500">{formatVoiceRecordingDuration(voiceDraftDurationMs)} ready to send</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={clearVoiceDraft}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Discard
                                </button>
                              </div>
                              <audio
                                ref={voiceDraftAudioRef}
                                src={voiceDraftPreviewUrl}
                                className="hidden"
                                onEnded={() => setIsPlayingVoiceDraft(false)}
                                onPause={() => setIsPlayingVoiceDraft(false)}
                                onPlay={() => setIsPlayingVoiceDraft(true)}
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <textarea
                            ref={composerRef}
                            value={composeBody}
                            onFocus={() => {
                              if (mentionTarget && mentionTarget !== "main") {
                                setMentionTarget(null);
                                setMentionQuery(null);
                                setMentionSuggestions([]);
                              }
                            }}
                            onChange={(e) => handleTextChange(e, "main", setComposeBody, setMentionAnchorIndex)}
                            onKeyDown={(e) => handleKeyDown(e, "main", composeBody, setComposeBody, composeMentionIds, setComposeMentionIds, () => {
                              handleSend(null, composeBody, composeFiles, composeCloudAttachments, composeMentionIds, quotingMessage, () => {
                                setComposeBody("");
                                setComposeFiles(null);
                                setComposeCloudAttachments([]);
                                setQuotingMessage(null);
                                setTaskTitle("");
                                setTaskChecklist("");
                                setTaskDueAt("");
                                setTaskAssigneeId("");
                                setShowTaskPopover(false);
                                setShowComposeMorePopover(false);
                                setShowComposeAttachmentPopover(false);
                                setShowComposeFormatPopover(false);
                                setShowComposeExpiryPopover(false);
                                if (composerRef.current) composerRef.current.style.height = "auto";
                              });
                            })}
                            placeholder={replyTo ? `Reply to ${replyTo.createdByUser?.name}...` : "History is on"}
                            className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-base text-slate-900 caret-slate-900 outline-none placeholder:text-slate-500"
                            rows={1}
                            style={{ height: "44px", maxHeight: "120px" }}
                          />
                          <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowComposeAttachmentPopover(false);
                                  setShowComposeMorePopover(false);
                                  setShowComposeExpiryPopover(false);
                                  setShowComposeFormatPopover((current) => !current);
                                }}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                title="Formatting"
                              >
                                <Bold className="h-4 w-4" />
                              </button>
                              {showComposeFormatPopover && (
                                <div className="absolute bottom-full right-0 z-[80] mb-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => { applyFormat({ before: "**", after: "**" }, composeBody, setComposeBody, composerRef); setShowComposeFormatPopover(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"><Bold className="h-4 w-4" /> Bold</button>
                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => { applyFormat({ before: "\n- ", after: "" }, composeBody, setComposeBody, composerRef); setShowComposeFormatPopover(false); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"><ListChecks className="h-4 w-4" /> Bullet list</button>
                                  <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => { openMentionPicker("main", composeBody, setComposeBody, composerRef); setShowComposeFormatPopover(false); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"><AtSign className="h-4 w-4" /> Mention</button>
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === "main" ? null : "main")} className="rounded-full p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600" title="Add Emoji"><SmilePlus className="h-4 w-4" /></button>
                              {showEmojiPicker === "main" && (
                                <div className="absolute bottom-full right-0 z-[80] mb-2 flex w-52 flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                  {EMOJI_LIST.map((em) => (
                                    <button key={em} onClick={() => { insertAtCursor(em, setComposeBody, composeBody, composerRef); setShowEmojiPicker(null); }} className="rounded-xl p-2 text-lg transition hover:bg-slate-100">{em}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowComposeFormatPopover(false);
                                  setShowComposeMorePopover(false);
                                  setShowComposeExpiryPopover(false);
                                  setShowComposeAttachmentPopover((current) => !current);
                                }}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                title="Attachments"
                              >
                                <Paperclip className="h-4 w-4" />
                              </button>
                              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" ref={composeFileInputRef} className="hidden" onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setComposeFiles((current) => mergeFiles(current, e.target.files));
                                }
                                e.target.value = "";
                              }} />
                              {showComposeAttachmentPopover && (
                                <div className="absolute bottom-full right-0 z-[80] mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">This device</p>
                                    <p className="mt-1 text-xs text-slate-500">Upload a local photo, PDF, spreadsheet, voice note, or other file.</p>
                                    <button type="button" onClick={() => { composeFileInputRef.current?.click(); setShowComposeAttachmentPopover(false); }} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                                      <Paperclip className="h-4 w-4" /> Upload from this device
                                    </button>
                                  </div>
                                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cloud link</p>
                                    <div className="mt-2 space-y-2">
                                      <select value={cloudProvider} onChange={(e) => setCloudProvider(e.target.value as CloudAttachmentDraft["provider"])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400">
                                        <option>Google Drive</option>
                                        <option>Dropbox</option>
                                        <option>OneDrive</option>
                                      </select>
                                      <input value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="Paste share link..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400" />
                                      <button type="button" onClick={() => { handleAddCloudAttachment("main"); setShowComposeAttachmentPopover(false); }} className="w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                                        Add cloud link
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowComposeFormatPopover(false);
                                  setShowComposeAttachmentPopover(false);
                                  setShowComposeMorePopover(false);
                                  setShowComposeExpiryPopover((current) => !current);
                                }}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                title="Message timing"
                              >
                                <Clock3 className="h-4 w-4" />
                              </button>
                              {showComposeExpiryPopover && (
                                <div className="absolute bottom-full right-0 z-[80] mb-2 w-36 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                  <select value={messageExpiryHours} onChange={(e) => setMessageExpiryHours(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-violet-300">
                                    <option value="0">Keep forever</option>
                                    <option value="1">Delete in 1h</option>
                                    <option value="24">Delete in 24h</option>
                                    <option value="168">Delete in 7d</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowComposeFormatPopover(false);
                                  setShowComposeAttachmentPopover(false);
                                  setShowComposeExpiryPopover(false);
                                  setShowComposeMorePopover((current) => !current);
                                }}
                                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                title="More options"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              {showComposeMorePopover && (
                                <div className="absolute bottom-full right-0 z-[80] mb-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                  <button type="button" onClick={() => { setShowTaskPopover(!showTaskPopover); setShowComposeMorePopover(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
                                    <CheckSquare className="h-4 w-4" /> Create task
                                  </button>
                                  <button type="button" onClick={() => { void toggleVoiceMessageRecording(); setShowComposeMorePopover(false); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                    <Mic className="h-4 w-4" /> {isRecordingVoiceMessage ? "Finish recording" : "Voice message"}
                                  </button>
                                  {voiceRecorderError ? (
                                    <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{voiceRecorderError}</p>
                                  ) : null}
                                  <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700">
                                    Translation stays in Bangla
                                  </div>
                                  {thread.thread.isDirectMessage ? (
                                    <form action={deleteMessageThreadAction} className="mt-2">
                                      <input type="hidden" name="threadId" value={thread.thread.id} />
                                      <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                                        <Trash2 className="h-4 w-4" /> Delete chat
                                      </button>
                                    </form>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleSend(null, composeBody, composeFiles, composeCloudAttachments, composeMentionIds, quotingMessage, () => {
                              setComposeBody("");
                              setComposeFiles(null);
                              setComposeCloudAttachments([]);
                              setQuotingMessage(null);
                              clearVoiceDraft();
                              setTaskTitle("");
                              setTaskChecklist("");
                              setTaskDueAt("");
                              setTaskAssigneeId("");
                              setShowTaskPopover(false);
                              setShowComposeMorePopover(false);
                              setShowComposeAttachmentPopover(false);
                              setShowComposeFormatPopover(false);
                              setShowComposeExpiryPopover(false);
                              if (composerRef.current) composerRef.current.style.height = "44px";
                            })}
                            disabled={sending || (!composeBody.trim() && (!composeFiles || composeFiles.length === 0) && composeCloudAttachments.length === 0)}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 transition shadow-sm"
                          >
                            <SendHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                        </div>
                    </div>
                    </div>
                 </div>
                 ) : null}
              </div>

              {/* Thread Side Panel */}
              {replyTo && (
                 <aside className="relative hidden xl:flex min-h-0 h-full flex-col overflow-hidden border-l border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)]">
                    <div className="flex items-center justify-between border-b border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ff_100%)] px-5 py-4">
                       <h3 className="font-bold text-slate-900">Thread</h3>
                       <button onClick={() => setReplyTo(null)} className="rounded-full bg-slate-50 p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
                    </div>
                    <div
                      ref={threadPanelScrollRef}
                      className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] p-5 space-y-4"
                      style={{
                        paddingBottom: `${threadComposerReserveHeight}px`,
                        scrollPaddingBottom: `${threadComposerReserveHeight + 24}px`,
                      }}
                    >
                       <div className="rounded-2xl border border-[#e8defe] bg-[linear-gradient(135deg,rgba(255,247,252,0.95)_0%,rgba(239,245,255,0.92)_100%)] px-4 py-3 shadow-[0_18px_36px_-30px_rgba(168,85,247,0.4)]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-600/80">
                                Replying to {replyTo.createdByUser?.name ?? "thread"}
                              </p>
                              <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                                {(repliesByParent.get(replyTo.id)?.length ?? 0)} repl{(repliesByParent.get(replyTo.id)?.length ?? 0) === 1 ? "y" : "ies"} in this thread
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => threadComposerRef.current?.focus()}
                              className="shrink-0 rounded-full border border-fuchsia-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-fuchsia-700 transition hover:border-fuchsia-300 hover:bg-white"
                            >
                              Jump to reply
                            </button>
                          </div>
                       </div>
                       <div
                         id={`message-thread-root-${replyTo.id}`}
                         className={cn(
                           "app-animate-in scroll-mt-28 rounded-2xl transition",
                           highlightedMessageId === replyTo.id ? "bg-violet-50/70 ring-2 ring-violet-200 ring-offset-2 ring-offset-transparent" : ""
                         )}
                       >
                         {renderQuotedMessagePreview(replyTo)}
                       {((replyTo.messageType === "SYSTEM_EVENT") || getDisplayBody(replyTo) || (replyTo.attachments?.length ?? 0) > 0) && (
                         <div className="rounded-2xl border border-violet-100 bg-white p-4 text-slate-700 shadow-sm">
                            {replyTo.messageType === "SYSTEM_EVENT" ? (
                              <span className="italic opacity-70 flex items-center gap-2"><div className="w-1 h-3 rounded bg-slate-200"></div>{replyTo.body}</span>
                            ) : getDisplayBody(replyTo) ? (
                              <MentionText body={getDisplayBody(replyTo)} mentions={replyTo.mentions} />
                            ) : null}
                            {renderMessageAttachments(replyTo.attachments, true)}
                         </div>
                       )}
                       </div>
                       <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#eadfff]"></div></div>
                          <div className="relative flex justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span className="bg-[linear-gradient(180deg,#fcfbff_0%,#f6f3ff_100%)] px-3">Replies</span></div>
                       </div>
                       {(repliesByParent.get(replyTo.id) ?? []).map(reply => (
                          <div
                            key={reply.id}
                            id={`message-thread-${reply.id}`}
                            className={cn(
                              "app-animate-in flex gap-3 group scroll-mt-28 rounded-2xl transition",
                              highlightedMessageId === reply.id ? "bg-violet-50/70 ring-2 ring-violet-200 ring-offset-2 ring-offset-transparent" : ""
                            )}
                          >
                             <UserAvatar name={reply.createdByUser?.name ?? "User"} avatarUrl={reply.createdByUser?.avatarUrl ?? null} size="sm" />
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-900">{reply.createdByUser?.name}</p>
                                  {reply.updatedAt !== reply.createdAt && (
                                     <span className="text-[10px] text-slate-400 italic mb-0">(edited)</span>
                                  )}
                                </div>
                                {editingMessageId === reply.id ? (
                                  <div className="w-full mt-1">
                                    <textarea
                                      value={editBody}
                                      onChange={(e) => setEditBody(e.target.value)}
                                      onKeyDown={(e) => {
                                         if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(reply.id); }
                                         else if (e.key === "Escape") { e.preventDefault(); cancelEditing(); }
                                      }}
                                      className="w-full rounded-xl border border-slate-200 p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                      rows={2}
                                    />
                                    <div className="mt-1 flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 font-medium pl-1 hidden sm:inline-block">Enter to save</span>
                                      <div className="flex items-center gap-2">
                                        <button onClick={cancelEditing} className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-full transition">Cancel</button>
                                        <button type="button" onClick={() => saveEdit(reply.id)} disabled={isSavingEdit || !editBody.trim()} className="inline-flex h-7 w-9 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 shadow-sm transition"><SendHorizontal className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {renderQuotedMessagePreview(reply)}
                                    {((reply.messageType === "SYSTEM_EVENT") || getDisplayBody(reply) || (reply.attachments?.length ?? 0) > 0) && (
                                      <div className="mt-1 bg-white border border-slate-100 rounded-xl px-3 py-2 text-sm text-slate-600">
                                         {reply.messageType === "SYSTEM_EVENT" ? (
                                             <span className="italic opacity-70 flex items-center gap-2"><div className="w-1 h-3 rounded bg-slate-200"></div>{reply.body}</span>
                                         ) : getDisplayBody(reply) ? (
                                             <MentionText body={getDisplayBody(reply)} mentions={reply.mentions} />
                                         ) : null}
                                 {renderMessageAttachments(reply.attachments, true)}
                                      </div>
                                    )}
                                  </>
                                )}
                                 {reply.messageType !== "SYSTEM_EVENT" && (
                                    <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                       {canManageThreadMessage(session, reply) && editingMessageId !== reply.id && (
                                         <>
                                           <button onClick={() => startEditing(reply)} className="text-[10px] font-bold text-slate-400 hover:text-fuchsia-600 transition">EDIT</button>
                                           <button
                                             onClick={() => void deleteMessage(reply.id)}
                                             className="text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
                                           >
                                             DELETE
                                           </button>
                                         </>
                                       )}
                                       <div className="relative">
                                          <button onClick={() => setShowMessageMenu(showMessageMenu === reply.id ? null : reply.id)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded">MORE</button>
                                          {showMessageMenu === reply.id && (
                                             <div className="absolute left-0 top-full z-[80] mt-1 w-48 rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-200">
                                                <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2" onClick={() => { setThreadQuotingMessage(reply); setShowMessageMenu(null); setShowEmojiPicker(null); window.setTimeout(() => threadComposerRef.current?.focus(), 0); }}>
                                                    <Quote className="h-4 w-4" /> Quote in reply
                                                </button>
                                                <button className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2" onClick={() => { navigator.clipboard.writeText(window.location.href); setShowMessageMenu(null); alert("Link copied to clipboard!"); }}>
                                                    <Link2 className="h-4 w-4" /> Copy message link
                                                </button>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 )}
                             </div>
                          </div>
                       ))}
                    </div>
                    <div
                      ref={threadComposerShellRef}
                      className={cn(
                        "absolute inset-x-0 bottom-0 z-20 max-h-[calc(100%-0.75rem)] overflow-y-auto overscroll-contain border-t border-[#ebe5ff] bg-[linear-gradient(180deg,rgba(255,254,254,0.95)_0%,rgba(251,247,255,0.98)_100%)] p-4 shadow-[0_-14px_36px_-28px_rgba(139,92,246,0.32)] backdrop-blur-sm",
                        dragTarget === "thread"
                          ? "bg-[linear-gradient(180deg,#fffaff_0%,#f5f8ff_100%)]"
                          : ""
                      )}
                      onDragOver={(event) => handleComposerDragOver(event, "thread")}
                      onDragLeave={(event) => handleComposerDragLeave(event, "thread")}
                      onDrop={(event) => handleComposerDrop(event, "thread")}
                        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                    >
                        {dragTarget === "thread" && (
                          <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-300 bg-white/80">
                            <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                              Drop files to attach
                            </p>
                          </div>
                        )}
{mentionTarget === "thread" && mentionQuery !== null && mentionSuggestions.length > 0 && (
                          <div className="absolute bottom-full left-4 mb-2 w-64 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
                            {mentionSuggestions.map((suggestion, i) => (
                              <button
                                key={suggestion.id}
                                className={cn(
                                  "w-full px-4 py-2 text-left flex items-center gap-3 transition",
                                  i === selectedMentionIndex ? "bg-violet-50 text-violet-900" : "hover:bg-slate-50 text-slate-700"
                                )}
onClick={() => {
  const before = threadReplyBody.slice(0, mentionAnchorIndex);
  const after = threadReplyBody.slice(mentionAnchorIndex + mentionQuery.length + 1);
  setThreadReplyBody(`${before}@${suggestion.name} ${after}`);
  if (!threadMentionIds.includes(suggestion.id)) {
    setThreadMentionIds([...threadMentionIds, suggestion.id]);
  }
  setMentionTarget(null);
  setMentionQuery(null);
  setMentionSuggestions([]);
  threadComposerRef.current?.focus();
}}
                              >
                                <UserAvatar name={suggestion.name} avatarUrl={suggestion.avatarUrl} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-tight">{suggestion.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{suggestion.roleName ?? "Member"}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedThreadReplyPreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 bg-white">
                            {selectedThreadReplyPreviews.map((preview, i) => (
                              <div key={i} className="relative group">
                                {preview.url ? (
                                  <img src={preview.url} alt={preview.name} className="h-10 w-10 object-cover rounded-lg border border-slate-200" />
                                ) : (
                                  <div className="h-10 w-14 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                                    <Paperclip className="h-4 w-4 text-slate-400" />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!threadReplyFiles) return;
                                    const dt = new DataTransfer();
                                    for(let j=0; j<threadReplyFiles.length; j++) { if (j !== i) dt.items.add(threadReplyFiles[j]); }
                                    setThreadReplyFiles(dt.files.length ? dt.files : null);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 bg-slate-800 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {threadCloudAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 bg-white">
                            {threadCloudAttachments.map((attachment) => (
                              <div key={attachment.id} className="group relative flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700 shadow-sm">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span className="font-semibold">{attachment.provider}</span>
                                <span className="max-w-[140px] truncate">{attachment.url}</span>
                                <button
                                  type="button"
                                  onClick={() => setThreadCloudAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                                  className="ml-0.5 rounded-full p-0.5 text-sky-400 hover:bg-sky-100 hover:text-sky-700 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {threadQuotingMessage ? (
                          <div className="px-3 pt-2">
                            <div className="rounded-2xl border border-violet-100 bg-[linear-gradient(135deg,rgba(250,245,255,0.96)_0%,rgba(240,246,255,0.96)_100%)] px-3 py-2 shadow-[0_10px_22px_-18px_rgba(139,92,246,0.38)]">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex items-start gap-2">
                                  <div className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,#d8b4fe_0%,#93c5fd_100%)]" />
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700/80">
                                      Quoting {threadQuotingMessage.createdByUser?.name ?? "message"}
                                    </p>
                                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">
                                      {getDisplayBody(threadQuotingMessage) || threadQuotingMessage.body || "Message unavailable"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setThreadQuotingMessage(null)}
                                  className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <textarea
                          ref={threadComposerRef}
                          value={threadReplyBody}
onFocus={() => {
  if (mentionTarget && mentionTarget !== "thread") {
    setMentionTarget(null);
    setMentionQuery(null);
    setMentionSuggestions([]);
  }
}}
onChange={(e) => handleTextChange(e, "thread", setThreadReplyBody, setMentionAnchorIndex)}
onKeyDown={(e) => handleKeyDown(e, "thread", threadReplyBody, setThreadReplyBody, threadMentionIds, setThreadMentionIds, () => {
   handleSend(replyTo, threadReplyBody, threadReplyFiles, threadCloudAttachments, threadMentionIds, threadQuotingMessage, () => {
     setThreadReplyBody("");
     setThreadCloudAttachments([]);
     setThreadQuotingMessage(null);
   });
})}
                          placeholder="Reply to thread..."
                          className="w-full resize-none border-0 bg-transparent p-3 text-sm text-slate-900 caret-slate-900 outline-none placeholder:text-slate-400"
                          rows={1}
                        />
                        <div className="flex items-center justify-between pb-1 px-1 mt-1 border-t border-slate-50 pt-2">
                           <div className="flex items-center gap-0.5 text-slate-400">
                             <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => applyFormat({ before: "**", after: "**" }, threadReplyBody, setThreadReplyBody, threadComposerRef)} className="p-1.5 hover:bg-slate-50 hover:text-slate-700 rounded-full transition" title="Bold"><Bold className="h-3.5 w-3.5" /></button>
                             <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => applyFormat({ before: "\n- ", after: "" }, threadReplyBody, setThreadReplyBody, threadComposerRef)} className="p-1.5 hover:bg-slate-50 hover:text-slate-700 rounded-full transition" title="Bullet List"><ListChecks className="h-3.5 w-3.5" /></button>
                             <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5"></div>
                             <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseUp={(e) => e.preventDefault()} onClick={() => openMentionPicker("thread", threadReplyBody, setThreadReplyBody, threadComposerRef)} className="p-1.5 hover:bg-slate-50 hover:text-violet-600 rounded-full transition" title="Mention"><AtSign className="h-3.5 w-3.5" /></button>
                             <button type="button" onClick={() => threadFileInputRef.current?.click()} className="p-1.5 hover:bg-slate-50 hover:text-slate-600 rounded-full transition" title="Attach"><Paperclip className="h-3.5 w-3.5" /></button>
                             <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" ref={threadFileInputRef} className="hidden" onChange={(e) => {
                                 if (e.target.files && e.target.files.length > 0) {
                                     setThreadReplyFiles((current) => mergeFiles(current, e.target.files));
                                 }
                                 e.target.value = "";
                             }} />
                             <div className="relative">
                               <button type="button" onClick={() => setShowCloudPopover(showCloudPopover === "thread" ? null : "thread")} className="p-1.5 hover:bg-slate-50 hover:text-sky-600 rounded-full transition" title="Attach from cloud"><FolderOpen className="h-3.5 w-3.5" /></button>
                               {showCloudPopover === "thread" && (
                                 <div className="absolute bottom-full right-0 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-[60]">
                                   <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cloud integration</p>
                                   <div className="mt-3 space-y-2">
                                     <select value={cloudProvider} onChange={(e) => setCloudProvider(e.target.value as CloudAttachmentDraft["provider"])} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400">
                                       <option>Google Drive</option>
                                       <option>Dropbox</option>
                                       <option>OneDrive</option>
                                     </select>
                                     <input value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="Paste share link..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400" />
                                     <button type="button" onClick={() => handleAddCloudAttachment("thread")} className="w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                                       Add cloud link
                                     </button>
                                   </div>
                                 </div>
                               )}
                             </div>
                             <button type="button" title="Create Task" onClick={() => setShowTaskPopover(!showTaskPopover)} className="p-1.5 hover:bg-sky-50 hover:text-sky-600 rounded-full transition"><CheckSquare className="h-3.5 w-3.5" /></button>
                             <div className="relative">
                                <button type="button" onClick={() => setShowEmojiPicker(showEmojiPicker === "thread" ? null : "thread")} className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-full transition" title="Add Emoji"><SmilePlus className="h-3.5 w-3.5" /></button>
                                {showEmojiPicker === "thread" && (
                                   <div className="absolute bottom-full right-0 mb-2 w-52 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-wrap gap-2 z-[60]">
                                      {EMOJI_LIST.map(em => (
                                         <button key={em} onClick={() => { insertAtCursor(em, setThreadReplyBody, threadReplyBody, threadComposerRef); setShowEmojiPicker(null); }} className="hover:bg-slate-100 p-2 rounded-xl text-lg transition">{em}</button>
                                      ))}
                                   </div>
                                )}
                             </div>
                           </div>
<button type="button" onClick={() => void handleSend(replyTo, threadReplyBody, threadReplyFiles, threadCloudAttachments, threadMentionIds, threadQuotingMessage, () => {
   setThreadReplyBody("");
   setThreadCloudAttachments([]);
   setThreadQuotingMessage(null);
   if (threadComposerRef.current) threadComposerRef.current.style.height = 'auto';
})} disabled={sending || (!threadReplyBody.trim() && (!threadReplyFiles || threadReplyFiles.length === 0) && threadCloudAttachments.length === 0)} className="inline-flex h-8 w-10 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-30 shadow-sm transition"><SendHorizontal className="h-3.5 w-3.5" /></button>
                        </div>
                    </div>
                 </aside>
              )}
            </div>
          </div>

          {/* Settings Modal (Pop up) */}
          {showChannelSettings && (
            <div className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
               <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                     <h3 className="font-bold text-lg text-slate-900">{thread.thread.isDirectMessage ? "Chat settings" : "Channel settings"}</h3>
                     <button onClick={() => setShowChannelSettings(false)} className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full transition shadow-sm"><X className="h-5 w-5 text-slate-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 hidden-scrollbar">
                    {SettingsContent()}
                  </div>
               </div>
            </div>
          )}
        </div>
      ) : activeTab === "profile" ? (
         <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
            {SettingsContent()}
         </div>
      ) : (
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
           <h2 className="text-2xl font-bold mb-6">Activity History</h2>
           <div className="space-y-4">
              {timeline.slice().reverse().map(item => (
                 <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                       <div className="flex items-center gap-3">
                          <UserAvatar name={item.createdByUser?.name ?? "User"} avatarUrl={item.createdByUser?.avatarUrl ?? null} size="sm" />
                          <span className="font-bold">{item.createdByUser?.name}</span>
                       </div>
                       <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3">{item.body}</p>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* Global Modals */}
      <MessageCallModal
        open={showCallModal}
        onOpenChange={setShowCallModal}
        call={thread.activeCall}
        session={session}
        threadName={thread.thread.displayName}
        onCallUpdated={(call) => setThread(curr => ({ ...curr, activeCall: call }))}
      />
      <PhotoEditorModal
        open={Boolean(openImageViewer)}
        images={openImageViewer?.images ?? []}
        index={openImageViewer?.index ?? 0}
        onClose={() => setOpenImageViewer(null)}
        onIndexChange={(index) =>
          setOpenImageViewer((current) => (current ? { ...current, index } : current))
        }
      />
      {openAttachmentVersions ? (
        <div className="fixed inset-0 z-[74] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{openAttachmentVersions.fileName}</p>
                <p className="text-xs text-slate-500">
                  {openAttachmentVersions.versionCount ?? openAttachmentVersions.versions?.length ?? 1} versions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenAttachmentVersions(null)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
              <div className="space-y-3">
                {(openAttachmentVersions.versions && openAttachmentVersions.versions.length > 0
                  ? openAttachmentVersions.versions
                  : [
                      {
                        id: "current",
                        versionNumber: 1,
                        fileName: openAttachmentVersions.fileName,
                        mimeType: openAttachmentVersions.mimeType || "application/octet-stream",
                        sizeBytes: 0,
                        createdAt: openAttachmentVersions.createdAt,
                      },
                    ]
                ).map((version, index) => {
                  const previewHref =
                    version.id === "current"
                      ? getMessageAttachmentPreviewHref(openAttachmentVersions.id)
                      : getMessageAttachmentVersionPreviewHref(openAttachmentVersions.id, version.id);
                  const downloadHref =
                    version.id === "current"
                      ? getMessageAttachmentHref(openAttachmentVersions.id)
                      : getMessageAttachmentVersionHref(openAttachmentVersions.id, version.id);
                  const previewable =
                    isPdfAttachment(version.fileName, version.mimeType) ||
                    isCodeAttachment(version.fileName, version.mimeType);

                  return (
                    <div key={version.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                              Version {version.versionNumber}
                            </span>
                            {index === 0 ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                Current
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-slate-900">{version.fileName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(version.createdAt).toLocaleString()}
                            {version.sizeBytes > 0 ? ` • ${Math.max(1, Math.round(version.sizeBytes / 1024))} KB` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {previewable ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenAttachmentPreview({
                                  id: openAttachmentVersions.id,
                                  fileName: version.fileName,
                                  mimeType: version.mimeType,
                                  previewHref,
                                })
                              }
                              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Preview
                            </button>
                          ) : null}
                          <a
                            href={downloadHref}
                            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {openAttachmentPreview ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-900">{openAttachmentPreview.fileName}</p>
                <p className="text-xs text-slate-500">{openAttachmentPreview.mimeType || "Preview"}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getMessageAttachmentHref(openAttachmentPreview.id)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setOpenAttachmentPreview(null)}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-50">
              {isPdfAttachment(openAttachmentPreview.fileName, openAttachmentPreview.mimeType) ? (
                <iframe
                  src={openAttachmentPreview.previewHref}
                  title={openAttachmentPreview.fileName}
                  className="h-full w-full border-0 bg-white"
                />
              ) : isCodeAttachment(openAttachmentPreview.fileName, openAttachmentPreview.mimeType) ? (
                <iframe
                  src={openAttachmentPreview.previewHref}
                  title={openAttachmentPreview.fileName}
                  className="h-full w-full border-0 bg-white"
                />
              ) : isVideoAttachment(openAttachmentPreview.fileName, openAttachmentPreview.mimeType) ? (
                <video
                  src={openAttachmentPreview.previewHref}
                  className="h-full w-full bg-black object-contain"
                  controls
                  playsInline
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8">
                  <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <Paperclip className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-4 text-base font-semibold text-slate-900">{openAttachmentPreview.fileName}</p>
                    <p className="mt-2 text-sm text-slate-500">Preview is not available for this file type yet, but the file is ready to download.</p>
                    <a
                      href={getMessageAttachmentHref(openAttachmentPreview.id)}
                      className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Download file
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
