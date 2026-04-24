"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  AtSign,
  Bell,
  Bookmark,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardList,
  GripVertical,
  Home,
  Inbox,
  LifeBuoy,
  LogOut,
  Menu,
  MessageCircleReply,
  MessageSquareDot,
  MessageSquareWarning,
  Minus,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  UserCircle2,
  X,
} from "lucide-react";
import { logoutAppUser } from "@/app/login/actions";
import { createMessageChannelAction } from "@/app/messages/actions";
import { UserAvatar } from "@/components/ui/user-avatar";
import { UserHoverCard } from "@/components/ui/user-hover-card";
import { cn } from "@/lib/utils";
import type { getMessageThreadWorkspace, getMessagingInboxWorkspace } from "@/modules/messaging";
import type { AppSession } from "@/lib/app-session";

type InboxWorkspace = Awaited<ReturnType<typeof getMessagingInboxWorkspace>>;
type ThreadWorkspace = Awaited<ReturnType<typeof getMessageThreadWorkspace>>;

const LiveMessageThreadPane = dynamic(
  () =>
    import("@/modules/messaging/ui/live-message-thread-pane").then(
      (mod) => mod.LiveMessageThreadPane,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="app-animate-in flex min-h-0 flex-1 items-center justify-center rounded-[2rem] border border-[#e9deff] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,244,255,0.96))] text-sm font-medium text-slate-500 shadow-[0_18px_50px_rgba(196,181,253,0.14)]">
        Loading conversation...
      </div>
    ),
  },
);

type MessageSupportCenterProps = {
  session: AppSession;
  workspace: InboxWorkspace;
  selectedThreadId: string | null;
  selectedThread: ThreadWorkspace | null;
  activeTab: "conversation" | "profile" | "history";
  initialConversationMode?: "conversation" | "ai";
  notice?: string;
  viewportClassName?: string;
};

function getRailItems(userType: string | null | undefined) {
  const role = (userType ?? "").toUpperCase();

  const dashboardHref =
    role === "ADMIN" ? "/dashboard/admin"
    : role === "CLIENT" ? "/dashboard/client"
    : role === "CONTRACTOR" ? "/dashboard/contractor"
    : role === "COORDINATOR" ? "/dashboard/coordinator"
    : role === "PROCESSOR" ? "/dashboard/processor"
    : "/dashboard/admin";

  const workOrdersHref =
    role === "ADMIN" ? "/dashboard/admin/work-orders"
    : role === "CLIENT" ? "/dashboard/client/work-orders"
    : role === "CONTRACTOR" ? "/dashboard/contractor/jobs"
    : role === "COORDINATOR" ? "/dashboard/coordinator/work-orders"
    : role === "PROCESSOR" ? "/dashboard/processor/work-orders"
    : "/dashboard/admin/work-orders";

  const messagesHref =
    role === "ADMIN" ? "/dashboard/admin/messages"
    : role === "CLIENT" ? "/dashboard/client/messages"
    : role === "CONTRACTOR" ? "/dashboard/contractor/messages"
    : role === "COORDINATOR" ? "/dashboard/coordinator/messages"
    : role === "PROCESSOR" ? "/dashboard/processor/messages"
    : "/messages";

  return [
    { icon: Home, href: dashboardHref as Route, label: "Dashboard", active: false },
    { icon: ClipboardList, href: workOrdersHref as Route, label: "Work Orders", active: false },
    { icon: MessageCircleReply, href: messagesHref as Route, label: "Messages", active: true },
  ];
}

const bottomRailItems = [
  { icon: UserCircle2, href: "/profile" as Route, label: "Profile" },
  { icon: Settings, href: "/notifications/settings" as Route, label: "Settings" },
];

const categoryIcons = {
  all: Inbox,
  mentions: AtSign,
  unread: MessageSquareDot,
  "needs-response": MessageSquareWarning,
  contractor: MessageCircleReply,
  client: UserCircle2,
  system: Bot,
  pinned: Bookmark,
  saved: Star,
  following: Bell,
} as const;

function buildMessagesHref(params: {
  basePath?: string;
  view?: string;
  thread?: string;
  tab?: string;
  search?: string;
  mode?: string;
  from?: string;
  saidIn?: string;
  startDate?: string;
  endDate?: string;
  hasFile?: string;
  hasLink?: boolean;
  mentionedMe?: boolean;
  onlyMine?: boolean;
}) {
  const searchParams = new URLSearchParams();
  const basePath = params.basePath || "/messages";

  if (params.view) {
    searchParams.set("view", params.view);
  }

  if (params.thread) {
    searchParams.set("thread", params.thread);
  }

  if (params.tab) {
    searchParams.set("tab", params.tab);
  }

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.mode) {
    searchParams.set("mode", params.mode);
  }

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.saidIn) {
    searchParams.set("saidIn", params.saidIn);
  }

  if (params.startDate) {
    searchParams.set("startDate", params.startDate);
  }

  if (params.endDate) {
    searchParams.set("endDate", params.endDate);
  }

  if (params.hasFile) {
    searchParams.set("hasFile", params.hasFile);
  }

  if (params.hasLink) {
    searchParams.set("hasLink", "1");
  }

  if (params.mentionedMe) {
    searchParams.set("mentionedMe", "1");
  }

  if (params.onlyMine) {
    searchParams.set("onlyMine", "1");
  }

  const query = searchParams.toString();
  return (query ? `${basePath}?${query}` : basePath) as Route;
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function threadDisplayLabel(thread: InboxWorkspace["threads"][number]) {
  return thread.displayName ?? thread.title ?? thread.participants[0] ?? thread.workOrder?.number ?? "Thread";
}

function formatSearchDateLabel(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) {
    return "Date";
  }

  return `${startDate || "Start"} - ${endDate || "End"}`;
}

function getDateRangePreset(key: string) {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);

  if (key === "any") {
    return { startDate: "", endDate: "" };
  }

  const start = new Date(today);

  if (key === "week") {
    start.setDate(start.getDate() - 7);
  } else if (key === "month") {
    start.setMonth(start.getMonth() - 1);
  } else if (key === "six-months") {
    start.setMonth(start.getMonth() - 6);
  } else if (key === "year") {
    start.setFullYear(start.getFullYear() - 1);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate,
  };
}

function highlightSearchText(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }

  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safeQuery})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-[#ffd54d] px-0.5 text-inherit">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

type NormalizedThreadMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  roleKey: string | null;
  roleName: string | null;
  isOnline: boolean;
};

function formatRoleName(role: string | null) {
  if (!role) {
    return null;
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeThreadMember(member: unknown): NormalizedThreadMember | null {
  if (!member || typeof member !== "object") {
    return null;
  }

  const record = member as Record<string, unknown>;
  const nestedUser =
    record.user && typeof record.user === "object" ? (record.user as Record<string, unknown>) : null;
  const nestedPresence =
    nestedUser?.presence && typeof nestedUser.presence === "object"
      ? (nestedUser.presence as Record<string, unknown>)
      : null;

  const id =
    typeof record.id === "string"
      ? record.id
      : typeof record.userId === "string"
        ? record.userId
        : typeof nestedUser?.id === "string"
          ? nestedUser.id
          : null;

  const name =
    typeof record.name === "string"
      ? record.name
      : typeof nestedUser?.name === "string"
        ? nestedUser.name
        : null;

  if (!id || !name) {
    return null;
  }

  const roleKey =
    typeof record.roleKey === "string"
      ? record.roleKey
      : typeof nestedUser?.role === "string"
        ? nestedUser.role
        : null;

  return {
    id,
    name,
    avatarUrl: typeof record.avatarUrl === "string" ? record.avatarUrl : null,
    roleKey,
    roleName: typeof record.roleName === "string" ? record.roleName : formatRoleName(roleKey),
    isOnline:
      typeof record.isOnline === "boolean"
        ? record.isOnline
        : nestedPresence?.status === "ONLINE",
  };
}

export function MessageSupportCenter({
  session,
  workspace,
  selectedThreadId,
  selectedThread,
  activeTab,
  initialConversationMode = "conversation",
  notice,
  viewportClassName,
}: MessageSupportCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const railItems = getRailItems(session.userType);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<"inbox" | "chat">("inbox");
  const [sidebarThreads, setSidebarThreads] = useState(workspace?.threads || []);
  const [localSearch, setLocalSearch] = useState(workspace?.search || "");
  const [topSearchOpen, setTopSearchOpen] = useState(Boolean(workspace?.search));
  const [channelOrder, setChannelOrder] = useState<string[]>([]);
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [shortcutsMounted, setShortcutsMounted] = useState(false);
  const [paneConversationMode, setPaneConversationMode] = useState<"conversation" | "ai">(initialConversationMode);
  const [headerSelectionMode, setHeaderSelectionMode] = useState<"shortcut" | "thread">(
    initialConversationMode === "ai" || ["all", "mentions", "pinned"].includes(workspace?.view ?? "all")
      ? "shortcut"
      : "thread"
  );
  const [openFilterMenu, setOpenFilterMenu] = useState<"from" | "saidIn" | "date" | "hasFile" | null>(null);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ left?: number; right?: number; top: number }>({
    left: 16,
    top: 0,
  });
  const filterButtonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const topSearchInputRef = useRef<HTMLInputElement | null>(null);
  const deferredLocalSearch = useDeferredValue(localSearch);
  const requestedConversationMode = initialConversationMode;
  const messagesBasePath = useMemo(() => {
    if (!pathname) {
      return "/messages";
    }

    return pathname.endsWith("/messages") ? pathname : "/messages";
  }, [pathname]);

  // Sync sidebar thread list when server re-renders (router.refresh)
  useEffect(() => {
    setSidebarThreads(workspace?.threads || []);
  }, [workspace]);

  useEffect(() => {
    setLocalSearch(workspace?.search || "");
  }, [workspace?.search]);

  useEffect(() => {
    if (workspace?.search) {
      setTopSearchOpen(true);
    }
  }, [workspace?.search]);

  useEffect(() => {
    setShortcutsMounted(true);
  }, []);

  useEffect(() => {
    setPaneConversationMode(initialConversationMode);
  }, [initialConversationMode]);

  useEffect(() => {
    if (initialConversationMode === "ai") {
      setHeaderSelectionMode("shortcut");
    }
  }, [initialConversationMode]);

  useEffect(() => {
    if (!localSearch.trim()) {
      setOpenFilterMenu(null);
    }
  }, [localSearch]);

  useEffect(() => {
    if (!topSearchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      topSearchInputRef.current?.focus();
    }, 60);

    return () => window.clearTimeout(timer);
  }, [topSearchOpen]);

  useEffect(() => {
    if (!openFilterMenu || typeof window === "undefined") {
      return;
    }

    const updatePosition = () => {
      const element = filterButtonRefs.current[openFilterMenu];
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const rightAligned = openFilterMenu === "date" || openFilterMenu === "hasFile";

      setFilterMenuPosition({
        top: rect.bottom + 8,
        left: rightAligned ? undefined : Math.max(16, rect.left),
        right: rightAligned ? Math.max(16, window.innerWidth - rect.right) : undefined,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openFilterMenu]);

// Ensure workspace has required properties
  const safeWorkspace = {
    threads: sidebarThreads,
    categories: workspace?.categories || [],
    view: workspace?.view || "all",
    search: workspace?.search || "",
    filters: workspace?.filters || {
      from: "",
      saidIn: "",
      startDate: "",
      endDate: "",
      hasFile: "",
      hasLink: false,
      mentionedMe: false,
      onlyConversationsImIn: false,
    },
    totals: workspace?.totals || { all: 0, unread: 0, pinned: 0, mentions: 0 },
    searchResults: workspace?.searchResults || { messages: [], files: [], users: [] }
  };
  const overallUnreadCount = safeWorkspace.totals.unread || 0;

  const rawChannelThreads = useMemo(
    () => safeWorkspace.threads.filter((t) => !t.isDirectMessage && !t.workOrderId && t.title),
    [safeWorkspace.threads]
  );

  const normalizedSelectedThreadMembers = (selectedThread?.members || [])
    .map(normalizeThreadMember)
    .filter((member): member is NormalizedThreadMember => member !== null);

  const normalizedSelectedThreadPrimaryParticipant =
    normalizeThreadMember(selectedThread?.primaryParticipant) ?? normalizedSelectedThreadMembers[0] ?? null;

  const normalizedSelectedThreadMentionableUsers =
    (selectedThread?.mentionableUsers || []).length > 0
      ? (selectedThread.mentionableUsers || []).map((user) => {
          const normalized = normalizeThreadMember(user);
          if (!normalized) {
            return null;
          }

          const record = user as Record<string, unknown>;

          return {
            ...normalized,
            userType:
              typeof record.userType === "string"
                ? record.userType
                : normalized.roleKey ?? "USER",
          };
        }).filter((user): user is NormalizedThreadMember & { userType: string } => user !== null)
      : normalizedSelectedThreadMembers.map((member) => ({
          ...member,
          userType: member.roleKey ?? "USER",
        }));

  const helperHref = buildMessagesHref({
    basePath: messagesBasePath,
    view: safeWorkspace.view,
    thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
    tab: "conversation",
    search: safeWorkspace.search,
    mode: "ai",
    from: safeWorkspace.filters.from,
    saidIn: safeWorkspace.filters.saidIn,
    startDate: safeWorkspace.filters.startDate,
    endDate: safeWorkspace.filters.endDate,
    hasFile: safeWorkspace.filters.hasFile,
    hasLink: safeWorkspace.filters.hasLink,
    mentionedMe: safeWorkspace.filters.mentionedMe,
    onlyMine: safeWorkspace.filters.onlyConversationsImIn,
  });

  const searchableUsers = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; avatarUrl: string | null; email?: string | null }>();

    safeWorkspace.threads.forEach((thread) => {
      if (thread.primaryParticipant?.id && thread.primaryParticipant?.name) {
        seen.set(thread.primaryParticipant.id, {
          id: thread.primaryParticipant.id,
          name: thread.primaryParticipant.name,
          avatarUrl: thread.primaryParticipant.avatarUrl ?? null,
        });
      }

      (thread.participantDetails || []).forEach((participant) => {
        if (participant.id && participant.name && !seen.has(participant.id)) {
          seen.set(participant.id, {
            id: participant.id,
            name: participant.name,
            avatarUrl: participant.avatarUrl ?? null,
            email: participant.email ?? null,
          });
        }
      });
    });

    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [safeWorkspace.threads]);

  const searchableChannels = useMemo(() => {
    return safeWorkspace.threads
      .filter((thread) => !thread.isDirectMessage && Boolean(threadDisplayLabel(thread)))
      .map((thread) => ({
        id: thread.id,
        label: threadDisplayLabel(thread),
        avatarUrl: thread.channelImageUrl ?? null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [safeWorkspace.threads]);

  const applySearchFilters = (nextFilters: Partial<typeof safeWorkspace.filters>) => {
    router.push(
      buildMessagesHref({
        basePath: messagesBasePath,
        view: safeWorkspace.view,
        thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
        tab: activeTab,
        search: localSearch.trim(),
        from: nextFilters.from ?? safeWorkspace.filters.from,
        saidIn: nextFilters.saidIn ?? safeWorkspace.filters.saidIn,
        startDate: nextFilters.startDate ?? safeWorkspace.filters.startDate,
        endDate: nextFilters.endDate ?? safeWorkspace.filters.endDate,
        hasFile: nextFilters.hasFile ?? safeWorkspace.filters.hasFile,
        hasLink: nextFilters.hasLink ?? safeWorkspace.filters.hasLink,
        mentionedMe: nextFilters.mentionedMe ?? safeWorkspace.filters.mentionedMe,
        onlyMine: nextFilters.onlyConversationsImIn ?? safeWorkspace.filters.onlyConversationsImIn,
      })
    );
  };

  const currentFilterChips = [
    {
      key: "from",
      label: safeWorkspace.filters.from || "From",
      active: Boolean(safeWorkspace.filters.from),
      dropdown: true,
      onClick: () => setOpenFilterMenu((current) => (current === "from" ? null : "from")),
    },
    {
      key: "saidIn",
      label: safeWorkspace.filters.saidIn || "Said in",
      active: Boolean(safeWorkspace.filters.saidIn),
      dropdown: true,
      onClick: () => setOpenFilterMenu((current) => (current === "saidIn" ? null : "saidIn")),
    },
    {
      key: "date",
      label: formatSearchDateLabel(safeWorkspace.filters.startDate, safeWorkspace.filters.endDate),
      active: Boolean(safeWorkspace.filters.startDate || safeWorkspace.filters.endDate),
      dropdown: true,
      onClick: () => setOpenFilterMenu((current) => (current === "date" ? null : "date")),
    },
    {
      key: "hasFile",
      label:
        safeWorkspace.filters.hasFile === "any" ? "Has file"
        : safeWorkspace.filters.hasFile === "documents" ? "Documents"
        : safeWorkspace.filters.hasFile === "spreadsheet" ? "Spreadsheet"
        : safeWorkspace.filters.hasFile === "presentation" ? "Presentation"
        : safeWorkspace.filters.hasFile === "image" ? "Image"
        : safeWorkspace.filters.hasFile === "pdf" ? "PDF"
        : safeWorkspace.filters.hasFile === "video" ? "Video"
        : "Has file",
      active: Boolean(safeWorkspace.filters.hasFile),
      dropdown: true,
      onClick: () => setOpenFilterMenu((current) => (current === "hasFile" ? null : "hasFile")),
    },
    {
      key: "hasLink",
      label: "Has link",
      active: safeWorkspace.filters.hasLink,
      dropdown: false,
      onClick: () => applySearchFilters({ hasLink: !safeWorkspace.filters.hasLink }),
    },
    {
      key: "mentionedMe",
      label: "Mentioned me",
      active: safeWorkspace.filters.mentionedMe,
      dropdown: false,
      onClick: () => applySearchFilters({ mentionedMe: !safeWorkspace.filters.mentionedMe }),
    },
    {
      key: "onlyMine",
      label: "Only conversations I'm in",
      active: safeWorkspace.filters.onlyConversationsImIn,
      dropdown: false,
      onClick: () =>
        applySearchFilters({
          onlyConversationsImIn: !safeWorkspace.filters.onlyConversationsImIn,
        }),
    },
  ] as const;

  const renderFilterMenu = (menuKey: "from" | "saidIn" | "date" | "hasFile") => {
    if (!localSearch.trim() || !openFilterMenu || openFilterMenu !== menuKey) {
      return null;
    }

    const baseMenuClass =
      "fixed z-[120] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.35rem] border border-[#e2d9fb] bg-white shadow-[0_24px_80px_rgba(142,125,194,0.18)]";

    if (openFilterMenu === "from") {
      return (
        <div className={cn(baseMenuClass, "w-[320px]")} style={filterMenuPosition}>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">From</div>
          <div className="max-h-[360px] overflow-y-auto px-2 py-2">
            <button
              type="button"
              onClick={() => {
                applySearchFilters({ from: "" });
                setOpenFilterMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {safeWorkspace.filters.from ? <Check className="h-4 w-4 text-[#2657d6]" /> : <span className="h-4 w-4" />}
              <span>Any user</span>
            </button>
            {searchableUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  applySearchFilters({ from: user.name });
                  setOpenFilterMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{user.name}</div>
                  {user.email ? <div className="truncate text-xs text-slate-500">{user.email}</div> : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (openFilterMenu === "saidIn") {
      return (
        <div className={cn(baseMenuClass, "w-[320px]")} style={filterMenuPosition}>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Said in</div>
          <div className="max-h-[360px] overflow-y-auto px-2 py-2">
            <button
              type="button"
              onClick={() => {
                applySearchFilters({ saidIn: "" });
                setOpenFilterMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {safeWorkspace.filters.saidIn ? <Check className="h-4 w-4 text-[#2657d6]" /> : <span className="h-4 w-4" />}
              <span>Any chat or space</span>
            </button>
            {searchableChannels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => {
                  applySearchFilters({ saidIn: channel.label });
                  setOpenFilterMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50"
              >
                {channel.avatarUrl ? (
                  <img src={channel.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Inbox className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 truncate text-sm font-medium text-slate-800">{channel.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (openFilterMenu === "date") {
      const dateOptions = [
        { key: "any", label: "Any time" },
        { key: "week", label: "Older than a week" },
        { key: "month", label: "Older than a month" },
        { key: "six-months", label: "Older than 6 months" },
        { key: "year", label: "Older than a year" },
      ];

      return (
        <div className={cn(baseMenuClass, "w-[290px]")} style={filterMenuPosition}>
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Date</div>
          <div className="px-2 py-2">
            {dateOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  applySearchFilters(getDateRangePreset(option.key));
                  setOpenFilterMenu(null);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {(option.key === "any" && !safeWorkspace.filters.startDate && !safeWorkspace.filters.endDate) ? (
                  <Check className="h-4 w-4 text-[#2657d6]" />
                ) : (
                  <span className="h-4 w-4" />
                )}
                <span>{option.label}</span>
              </button>
            ))}
            <div className="my-2 border-t border-slate-100" />
            <div className="space-y-2 px-3 pb-3 pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  defaultValue={safeWorkspace.filters.startDate || ""}
                  onChange={(event) => applySearchFilters({ startDate: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#c9b6ff]"
                />
                <input
                  type="date"
                  defaultValue={safeWorkspace.filters.endDate || ""}
                  onChange={(event) => applySearchFilters({ endDate: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#c9b6ff]"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(baseMenuClass, "w-[280px]")} style={filterMenuPosition}>
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Has file</div>
        <div className="px-2 py-2">
          {[
            ["any", "Any File"],
            ["documents", "Documents"],
            ["spreadsheet", "Spreadsheet"],
            ["presentation", "Presentation"],
            ["image", "Image"],
            ["pdf", "PDF"],
            ["video", "Video"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                applySearchFilters({ hasFile: value });
                setOpenFilterMenu(null);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {safeWorkspace.filters.hasFile === value ? <Check className="h-4 w-4 text-[#2657d6]" /> : <span className="h-4 w-4" />}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const shortcutItems = [
    {
      key: "all",
      label: "All Threads",
      description: null,
      icon: Home,
      count: safeWorkspace.totals.all,
      href: buildMessagesHref({
        basePath: messagesBasePath,
        view: "all",
        thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
        tab: activeTab,
        search: safeWorkspace.search,
      }),
    },
    {
      key: "mentions",
      label: "Mentions",
      description: null,
      icon: AtSign,
      count: safeWorkspace.totals.mentions || 0,
      href: buildMessagesHref({
        basePath: messagesBasePath,
        view: "mentions",
        thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
        tab: activeTab,
        search: safeWorkspace.search,
      }),
    },
    {
      key: "pinned",
      label: "Starred",
      description: null,
      icon: Star,
      count: safeWorkspace.totals.pinned,
      href: buildMessagesHref({
        basePath: messagesBasePath,
        view: "pinned",
        thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
        tab: activeTab,
        search: safeWorkspace.search,
      }),
    },
  ];

  const normalizedLocalSearch = deferredLocalSearch.trim().toLowerCase();

  const matchesThreadSearch = useMemo(() => {
    return (thread: typeof safeWorkspace.threads[number]) => {
      if (!normalizedLocalSearch) {
        return true;
      }

      const haystack = [
        thread.displayName,
        thread.title,
        thread.primaryParticipant?.name,
        thread.latestMessage?.body,
        thread.workOrder?.workOrderNumber,
        thread.workOrder?.addressLine1,
        thread.workOrder?.city,
        thread.workOrder?.state,
        ...(thread.participants ?? []),
      ]
        .filter((value): value is string => typeof value === "string" && value.length > 0)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedLocalSearch);
    };
  }, [normalizedLocalSearch]);

  const directThreads = safeWorkspace.threads.filter((t) => t.isDirectMessage);
  const workOrderThreads = safeWorkspace.threads.filter((t) => Boolean(t.workOrderId));
  const unreadWorkOrderThreads = workOrderThreads.filter(
    (t) => (t.unreadCount ?? 0) > 0
  );

  const channelThreads = useMemo(() => {
    if (rawChannelThreads.length === 0) {
      return [];
    }

    if (channelOrder.length === 0) {
      return rawChannelThreads;
    }

    const threadMap = new Map(rawChannelThreads.map((thread) => [thread.id, thread]));
    const ordered = channelOrder
      .map((id) => threadMap.get(id))
      .filter((thread): thread is (typeof rawChannelThreads)[number] => Boolean(thread));
    const unordered = rawChannelThreads.filter((thread) => !channelOrder.includes(thread.id));
    return [...ordered, ...unordered];
  }, [channelOrder, rawChannelThreads]);

  const filteredChannelThreads = useMemo(() => channelThreads, [channelThreads]);

  const openSearchResultThread = (threadId: string) => {
    const href = buildMessagesHref({
      basePath: messagesBasePath,
      view: safeWorkspace.view,
      thread: threadId,
      tab: "conversation",
    });

    setHeaderSelectionMode("thread");
    setPaneConversationMode("conversation");
    setMobileActiveTab("chat");
    setLocalSearch("");
    setTopSearchOpen(false);
    setOpenFilterMenu(null);
    router.push(href);
    router.refresh();
  };

  const fallbackSearchResults = useMemo(() => {
    const query = normalizedLocalSearch;

    if (!query) {
      return { messages: [], files: [], users: [] };
    }

    const messages = safeWorkspace.threads
      .filter((thread) => matchesThreadSearch(thread))
      .map((thread) => ({
        id: thread.id,
        body:
          thread.latestMessage?.body ||
          thread.workOrder?.addressLine1 ||
          thread.displayName ||
          thread.title ||
          "",
        threadId: thread.id,
        threadLabel: threadDisplayLabel(thread),
        createdAt: thread.latestMessage?.createdAt ?? null,
      }))
      .filter((item) => item.body.trim())
      .slice(0, 12);

    const users = safeWorkspace.threads.flatMap((thread) =>
      (thread.participantDetails || [])
        .filter((participant) =>
          `${participant.name} ${participant.email || ""}`.toLowerCase().includes(query)
        )
        .map((participant) => ({
          id: `${participant.id}-${thread.id}`,
          name: participant.name,
          avatarUrl: participant.avatarUrl ?? null,
          threadId: thread.id,
          threadLabel: threadDisplayLabel(thread),
          role: null as string | null,
        }))
    ).slice(0, 10);

    return { messages, files: [], users };
  }, [matchesThreadSearch, normalizedLocalSearch, safeWorkspace.threads]);

  const effectiveSearchResults = useMemo(() => {
    const serverHasResults =
      safeWorkspace.searchResults.messages.length > 0 ||
      safeWorkspace.searchResults.files.length > 0 ||
      safeWorkspace.searchResults.users.length > 0;

    if (localSearch.trim() && (localSearch.trim() !== safeWorkspace.search.trim() || !serverHasResults)) {
      return fallbackSearchResults;
    }

    return safeWorkspace.searchResults;
  }, [fallbackSearchResults, localSearch, safeWorkspace.search, safeWorkspace.searchResults]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const saved = window.localStorage.getItem(`messages:channel-order:${session.id}`);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setChannelOrder(parsed.filter((id): id is string => typeof id === "string"));
      }
    } catch (error) {
      console.error("Failed to restore channel order:", error);
    }
  }, [session.id]);

  useEffect(() => {
    const visibleChannelIds = rawChannelThreads.map((thread) => thread.id);

    setChannelOrder((current) => {
      const next = current.filter((id) => visibleChannelIds.includes(id));
      const missing = visibleChannelIds.filter((id) => !next.includes(id));
      const merged = [...next, ...missing];

      if (
        merged.length === current.length &&
        merged.every((id, index) => id === current[index])
      ) {
        return current;
      }

      return merged;
    });
  }, [rawChannelThreads]);

  useEffect(() => {
    if (typeof window === "undefined" || channelOrder.length === 0) {
      return;
    }

    window.localStorage.setItem(`messages:channel-order:${session.id}`, JSON.stringify(channelOrder));
  }, [channelOrder, session.id]);

  const reorderChannels = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setChannelOrder((current) => {
      const baseOrder = current.length > 0 ? [...current] : rawChannelThreads.map((thread) => thread.id);
      const sourceIndex = baseOrder.indexOf(sourceId);
      const targetIndex = baseOrder.indexOf(targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return baseOrder;
      }

      const [moved] = baseOrder.splice(sourceIndex, 1);
      baseOrder.splice(targetIndex, 0, moved);
      return baseOrder;
    });
  };

  return (
    <main className={cn("fixed inset-0 z-50 flex overflow-hidden bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)] lg:bg-transparent", viewportClassName)}>
      {notice ? (
        <div className="absolute left-1/2 top-6 z-[60] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 rounded-full border border-sky-200 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-900 shadow-[0_10px_24px_-10px_rgba(14,165,233,0.3)]">
          {notice}
        </div>
      ) : null}

      {/* Mobile Tab Header */}
      <div className="absolute left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[#ebe5ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,244,255,0.96)_100%)] px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-slate-500" />
          <span className="text-sm font-bold text-slate-800">
            {mobileActiveTab === "inbox" ? "Inbox" : selectedThread?.displayName || "Chat"}
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-hidden rounded-full border border-[#e3dcff] bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)] p-1">
          <button
            onClick={() => setMobileActiveTab("inbox")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              mobileActiveTab === "inbox" ? "bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-sm" : "text-slate-500"
            )}
          >
            Inbox
          </button>
          <button
            onClick={() => setMobileActiveTab("chat")}
            disabled={!selectedThreadId}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50",
              mobileActiveTab === "chat" ? "bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-sm" : "text-slate-500"
            )}
          >
            Chat
          </button>
        </div>
      </div>

      <div className="mt-14 flex min-h-0 flex-1 overflow-hidden border-b border-[#ebe5ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,244,255,0.94)_52%,rgba(239,245,255,0.94)_100%)] shadow-[0_24px_80px_-50px_rgba(189,181,236,0.24)] backdrop-blur lg:mt-0">
        <div className={cn(
          "grid h-full w-full transition-all duration-300 ease-in-out",
          sidebarOpen 
            ? "grid-cols-1 lg:grid-cols-[84px_minmax(0,1fr)]" 
            : "grid-cols-1 lg:grid-cols-[84px_minmax(0,1fr)]"
        )}>
          <aside className="hidden min-h-0 flex-col items-center justify-between border-r border-[#ebe5ff] bg-[linear-gradient(180deg,#fffefe_0%,#faf4ff_38%,#eef4ff_100%)] px-4 py-2.5 shadow-[inset_-1px_0_0_rgba(224,211,255,0.5)] lg:flex">
            <div className="flex w-full flex-1 flex-col items-center pt-11">
              <div className="space-y-1.5">
                {railItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-2xl text-white/90 transition",
                        item.active
                          ? "bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] shadow-[0_14px_30px_rgba(196,156,255,0.24)] ring-1 ring-fuchsia-200/90 text-[#2b3159]"
                          : "hover:bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)] text-[#7280ad]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label === "Messages" && overallUnreadCount > 0 ? (
                        <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff2fb_0%,#eef4ff_100%)] px-1 text-[8px] font-bold text-fuchsia-700 shadow-sm ring-1 ring-fuchsia-100">
                          {overallUnreadCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              <div className="my-2.5 h-px w-8 bg-[#e6deff]" />

              <div className="flex flex-1 flex-col items-center gap-1 overflow-hidden">
                {safeWorkspace.categories.map((category) => {
                  const Icon = categoryIcons[category.key as keyof typeof categoryIcons] ?? LifeBuoy;
                  const active = safeWorkspace.view === category.key;
                  return (
                    <Link
                      key={category.key}
                      href={buildMessagesHref({
                        basePath: messagesBasePath,
                        view: category.key,
                        thread: selectedThreadId ?? safeWorkspace.threads[0]?.id,
                        tab: activeTab,
                        search: safeWorkspace.search,
                        mode: requestedConversationMode === "ai" ? "ai" : undefined,
                      })}
                      aria-label={category.label}
                      title={`${category.label} (${category.count})`}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-2xl text-white/90 transition",
                        active
                          ? "bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] shadow-[0_14px_30px_rgba(196,156,255,0.24)] ring-1 ring-fuchsia-200/90 text-[#2b3159]"
                          : "hover:bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)] text-[#7280ad]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {category.count > 0 ? (
                        <span className="absolute right-0.5 top-0.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff2fb_0%,#eef4ff_100%)] px-1 text-[8px] font-bold text-fuchsia-700 shadow-sm ring-1 ring-fuchsia-100">
                          {category.count}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-2.5 h-px w-8 bg-[#e6deff]" />

              <div className="mt-2.5 space-y-1.5">
                {bottomRailItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#7280ad] transition hover:bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)]"
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative group block">
                <label className="cursor-pointer block relative">
                  <UserAvatar name={session.name} avatarUrl={session.avatarUrl} size="sm" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <Plus className="h-3 w-3 text-white" />
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.set("avatar", file);
                      try {
                        await fetch("/api/profile/avatar", { method: "POST", body: formData });
                      } finally {
                        e.target.value = "";
                        window.location.reload();
                      }
                    }}
                  />
                </label>
                {session.avatarUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Remove profile photo?")) return;
                      await fetch("/api/profile/avatar", { method: "DELETE" });
                      window.location.reload();
                    }}
                  className="absolute -top-1 -right-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#7280ad] text-white opacity-0 group-hover:opacity-100 transition hover:bg-[#5b6994] shadow-sm"
                    title="Remove photo"
                  >
                    <X className="h-2 w-2" />
                  </button>
                )}
              </div>
              <form action={logoutAppUser}>
                <button
                  type="submit"
                  aria-label="Logout"
                  title="Logout"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#7280ad] transition hover:bg-[linear-gradient(135deg,rgba(255,245,251,0.96)_0%,rgba(239,245,255,0.96)_100%)]"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </aside>

          <div className="relative flex min-w-0 min-h-0 flex-1 flex-col bg-[linear-gradient(180deg,#fffefe_0%,#f8f4ff_52%,#eef4ff_100%)]">
          <div className="flex min-h-0 flex-1">
          <section className={cn(
            "app-animate-soft relative min-h-0 shrink-0 border-r border-[#ebe5ff] bg-transparent px-0 py-0 transition-all duration-300 overflow-hidden",
            mobileActiveTab === "inbox" ? "block" : "hidden lg:block",
            !sidebarOpen ? "lg:w-0 lg:opacity-0" : "lg:w-[340px] lg:opacity-100"
          )}>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-3 top-12 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-[#e3dcff] bg-[linear-gradient(135deg,#ffffff_0%,#f4efff_100%)] text-slate-400 shadow-sm transition hover:text-slate-600 lg:flex"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="h-full overflow-y-auto px-3 py-4">
              <div className="space-y-6">
              {/* ── 1. SHORTCUTS ── */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>Shortcuts</span>
                  </div>
                  <div className="space-y-1">
                    {shortcutsMounted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileActiveTab("chat");
                          setPaneConversationMode("ai");
                          setHeaderSelectionMode("shortcut");
                          router.push(helperHref);
                        }}
                        className={cn(
                          "app-hover-lift flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition",
                          requestedConversationMode === "ai"
                            ? "border border-[#e8bfff] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-[0_12px_24px_rgba(196,156,255,0.22)]"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Sparkles className="h-4 w-4 text-slate-500" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">AI Assistant</div>
                            <div className="text-[11px] font-medium text-slate-500">Chat with helper</div>
                          </div>
                        </div>
                        <span className="rounded-full bg-[linear-gradient(135deg,#fdf0fa_0%,#eef4ff_100%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-700">
                          Chat
                        </span>
                      </button>
                    ) : null}
                    {shortcutItems.map((item) => {
                      const Icon = item.icon;
                      const active = safeWorkspace.view === item.key;
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => {
                            setPaneConversationMode("conversation");
                            setHeaderSelectionMode("shortcut");
                          }}
                          className={cn(
                            "app-hover-lift flex items-center justify-between rounded-xl px-3 py-2.5 transition",
                            active
                              ? "border border-[#e8bfff] bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] text-[#2b3159] shadow-[0_12px_24px_rgba(196,156,255,0.22)]"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-slate-500" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{item.label}</div>
                              {item.description ? (
                                <div className="text-[11px] font-medium text-slate-500">
                                  {item.description}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          {item.count !== null ? (
                            <span className="text-sm font-semibold text-slate-500">{item.count}</span>
                          ) : (
                            <span className="rounded-full bg-[linear-gradient(135deg,#fdf0fa_0%,#eef4ff_100%)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-700">
                              Chat
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                {/* ── 2. DIRECT MESSAGES ── */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>Direct Messages</span>
                    <span>{directThreads.length}</span>
                  </div>
                  {directThreads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                      No direct messages yet.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {directThreads.map((thread) => {
                        const active = selectedThreadId === thread.id;
                        const threadHref = buildMessagesHref({
                          basePath: messagesBasePath,
                          view: safeWorkspace.view,
                          thread: thread.id,
                          tab: activeTab,
                        });
                        return (
                          <Link
                            key={thread.id}
                            href={threadHref}
                            onClick={(event) => {
                              event.preventDefault();
                              setPaneConversationMode("conversation");
                              setHeaderSelectionMode("thread");
                              setMobileActiveTab("chat");
                              setLocalSearch("");
                              setTopSearchOpen(false);
                              setOpenFilterMenu(null);
                              router.push(threadHref);
                              router.refresh();
                            }}
                            className={cn(
                              "app-hover-lift relative overflow-hidden flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                              active ? "bg-sky-100/80" : "hover:bg-slate-50"
                            )}
                          >
                            <div className="absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,rgba(236,72,153,0)_0%,rgba(220,47,233,0.42)_18%,rgba(133,100,255,0.36)_52%,rgba(96,165,250,0.38)_82%,rgba(96,165,250,0)_100%)]" />
                            <UserHoverCard
                              currentUserId={session.id}
                              user={{
                                id: thread.primaryParticipant?.id ?? thread.id,
                                name: thread.primaryParticipant?.name ?? threadDisplayLabel(thread),
                                avatarUrl: thread.primaryParticipant?.avatarUrl ?? null,
                                isOnline: thread.primaryParticipant?.isOnline ?? false,
                              }}
                            >
                              <div className="relative shrink-0">
                                <UserAvatar
                                  name={thread.primaryParticipant?.name ?? threadDisplayLabel(thread)}
                                  avatarUrl={thread.primaryParticipant?.avatarUrl ?? null}
                                  size="sm"
                                />
                                {thread.primaryParticipant?.isOnline ? (
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
                                ) : null}
                              </div>
                            </UserHoverCard>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{threadDisplayLabel(thread)}</p>
                              {thread.latestMessage?.body && (
                                <p className="truncate text-xs text-slate-500 mt-0.5">{thread.latestMessage.body}</p>
                              )}
                            </div>
                            {(thread.unreadCount ?? 0) > 0 ? (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {thread.unreadCount}
                              </span>
                            ) : null}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── 3. CHANNELS ── */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>Channels</span>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[10px] font-medium normal-case tracking-normal text-slate-400 lg:inline">
                        Drag to reorder
                      </span>
                    <span>{filteredChannelThreads.length}</span>
                      <details className="group">
                        <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-fuchsia-200 hover:text-fuchsia-600">
                          <Plus className="h-4 w-4 group-open:hidden" />
                          <Minus className="hidden h-4 w-4 group-open:block" />
                        </summary>
                        <form
                          action={createMessageChannelAction}
                          className="app-animate-in mt-3 w-[248px] rounded-2xl border border-slate-200 bg-slate-50/95 p-3 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.22)]"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Create Channel
                          </p>
                          <div className="mt-2 space-y-2">
                            <input type="text" name="title" placeholder="Channel name" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300" required />
                            <textarea name="body" placeholder="Optional starter note with @mentions if needed" rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300" />
                            <label className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 cursor-pointer hover:border-violet-300 transition">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                                <Plus className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700">Channel photo</p>
                                <p className="text-[10px] text-slate-400">Optional — click to upload</p>
                              </div>
                              <input type="file" name="channelPhoto" accept="image/*" className="hidden" />
                            </label>
                            <button type="submit" className="w-full rounded-xl bg-[linear-gradient(135deg,#6d14ff_0%,#ff4f8e_100%)] px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-18px_rgba(109,20,255,0.6)] transition hover:opacity-95">
                              Create channel
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>
                  </div>
                  {filteredChannelThreads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400">
                      {normalizedLocalSearch ? "No channels match this search." : "No channels yet. Create one above."}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredChannelThreads.map((thread) => {
                        const active = selectedThreadId === thread.id;
                        const threadHref = buildMessagesHref({
                          basePath: messagesBasePath,
                          view: safeWorkspace.view,
                          thread: thread.id,
                          tab: activeTab,
                        });
                        return (
                          <div
                            key={thread.id}
                            draggable
                            onDragStart={() => setDraggedChannelId(thread.id)}
                            onDragEnd={() => setDraggedChannelId(null)}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (draggedChannelId) {
                                reorderChannels(draggedChannelId, thread.id);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (draggedChannelId) {
                                reorderChannels(draggedChannelId, thread.id);
                              }
                              setDraggedChannelId(null);
                            }}
                            className={cn(
                              "group relative overflow-hidden rounded-xl transition",
                              draggedChannelId === thread.id ? "opacity-60" : ""
                            )}
                          >
                            <div className="absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,rgba(236,72,153,0)_0%,rgba(220,47,233,0.42)_18%,rgba(133,100,255,0.36)_52%,rgba(96,165,250,0.38)_82%,rgba(96,165,250,0)_100%)]" />
                            <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-1 text-slate-300 opacity-0 shadow-sm ring-1 ring-slate-200 transition group-hover:opacity-100">
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                            <Link
                              href={threadHref}
                              onClick={(event) => {
                                event.preventDefault();
                                setPaneConversationMode("conversation");
                                setHeaderSelectionMode("thread");
                                setMobileActiveTab("chat");
                                setLocalSearch("");
                                setTopSearchOpen(false);
                                setOpenFilterMenu(null);
                                router.push(threadHref);
                                router.refresh();
                              }}
                              className={cn(
                                "relative flex items-start gap-3 rounded-xl px-3 py-2.5 pl-9 transition",
                                active ? "bg-sky-100/80 shadow-[0_10px_24px_-18px_rgba(14,165,233,0.35)]" : "hover:bg-slate-50"
                              )}
                            >
                              <UserAvatar name={threadDisplayLabel(thread)} avatarUrl={thread.channelImageUrl ?? null} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-800">{threadDisplayLabel(thread)}</p>
                                  {(thread.unreadCount ?? 0) > 0 ? (
                                    <span className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                                  ) : null}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {thread.latestMessage?.body ?? "No activity yet."}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{thread.participantCount ?? 0} members</p>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── 4. WORK ORDER MESSAGES ── */}
                <div>
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <span>Work Order Messages</span>
                    <div className="flex items-center gap-1.5">
                      {unreadWorkOrderThreads.length > 0 && (
                        <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {unreadWorkOrderThreads.length} new
                        </span>
                      )}
                      <span>{workOrderThreads.length}</span>
                    </div>
                  </div>
                  {workOrderThreads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                      <p className="text-xs text-slate-400">No work order messages yet.</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Messages sent from a work order will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {workOrderThreads.map((thread) => {
                        const active = selectedThreadId === thread.id;
                        const hasUnread = (thread.unreadCount ?? 0) > 0;
                        const woNumber = thread.workOrder?.workOrderNumber ?? thread.displayName ?? threadDisplayLabel(thread);
                        const address = thread.workOrder?.addressLine1 ?? thread.latestMessage?.body ?? "";
                        const threadHref = buildMessagesHref({
                          basePath: messagesBasePath,
                          view: safeWorkspace.view,
                          thread: thread.id,
                          tab: activeTab,
                        });
                        return (
                          <Link
                            key={thread.id}
                            href={threadHref}
                            onClick={(event) => {
                              event.preventDefault();
                              setPaneConversationMode("conversation");
                              setHeaderSelectionMode("thread");
                              setMobileActiveTab("chat");
                              setLocalSearch("");
                              setTopSearchOpen(false);
                              setOpenFilterMenu(null);
                              router.push(threadHref);
                              router.refresh();
                            }}
                            className={cn(
                              "relative overflow-hidden flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                              active
                                ? "bg-sky-100/80 shadow-[0_2px_12px_-4px_rgba(14,165,233,0.25)]"
                                : hasUnread
                                ? "bg-blue-50/60 hover:bg-blue-50"
                                : "hover:bg-slate-50"
                            )}
                          >
                            <div className="absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,rgba(236,72,153,0)_0%,rgba(220,47,233,0.42)_18%,rgba(133,100,255,0.36)_52%,rgba(96,165,250,0.38)_82%,rgba(96,165,250,0)_100%)]" />
                            {/* WO badge avatar */}
                            <div className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                              hasUnread
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            )}>
                              WO
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <p className={cn(
                                  "truncate text-sm",
                                  hasUnread ? "font-bold text-slate-900" : "font-semibold text-slate-800"
                                )}>
                                  {woNumber}
                                </p>
                                {hasUnread && (
                                  <span className="ml-1 mt-0.5 inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {thread.unreadCount}
                                  </span>
                                )}
                              </div>
                              {address && (
                                <p className="mt-0.5 truncate text-xs text-slate-500">{address}</p>
                              )}
                              {thread.latestMessage?.body && (
                                <p className="mt-0.5 truncate text-[11px] text-slate-400">{thread.latestMessage.body}</p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </section>

          <section className={cn(
            "relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden bg-white",
            mobileActiveTab === "chat" ? "block" : "hidden lg:flex"
          )}>
            <div className="pointer-events-none absolute left-4 right-4 top-2 z-40">
              <div className="mx-auto max-w-[1120px] overflow-visible">
                <div className="pointer-events-auto flex w-fit max-w-full items-center gap-1.5 overflow-x-auto overflow-y-visible pb-1">
                  <div
                    className={cn(
                      "flex shrink-0 items-center overflow-hidden rounded-[1rem] border border-[#d7deec] bg-[#dfe7f4] shadow-[0_8px_18px_rgba(173,186,220,0.16)] transition-all duration-300 ease-out",
                      topSearchOpen || localSearch.trim()
                        ? "w-[210px] px-3 py-1.5 sm:w-[230px] lg:w-[250px]"
                        : "w-10 px-0 py-0"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (topSearchOpen || localSearch.trim()) {
                          topSearchInputRef.current?.focus();
                          return;
                        }
                        setTopSearchOpen(true);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-600 transition hover:bg-white/30"
                      aria-label="Open search"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-2 transition-all duration-300 ease-out",
                        topSearchOpen || localSearch.trim() ? "w-full opacity-100" : "w-0 opacity-0"
                      )}
                    >
                      <input
                        ref={topSearchInputRef}
                        type="text"
                        value={localSearch}
                        onChange={(event) => setLocalSearch(event.target.value)}
                        placeholder="Search threads, files, people..."
                        className="h-5 w-full bg-transparent text-[0.74rem] font-medium text-slate-800 outline-none placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSearch("");
                          setTopSearchOpen(false);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/50 hover:text-slate-700"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {localSearch.trim() ? (
                    <div className="relative flex min-w-max items-center gap-1 overflow-visible">
                      {currentFilterChips.map((chip) => (
                        <div
                          key={chip.key}
                          className="relative overflow-visible"
                          ref={(element) => {
                            filterButtonRefs.current[chip.key] = element;
                          }}
                        >
                          <button
                            type="button"
                            onClick={chip.onClick}
                            className={cn(
                              "rounded-[0.95rem] border px-2.5 py-1.5 text-[0.7rem] font-medium transition",
                              chip.active
                                ? "border-[#d7deec] bg-[#dfe7f4] text-[#2657d6]"
                                : "border-[#d9deee] bg-white text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {chip.active ? <Check className="h-3 w-3" /> : null}
                              <span>{chip.label}</span>
                              {chip.dropdown ? <ChevronDown className="h-3 w-3" /> : null}
                            </span>
                          </button>
                          {chip.dropdown ? renderFilterMenu(chip.key) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute -left-3 top-12 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-600 lg:flex"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {selectedThread ? (
              <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", localSearch.trim() ? "pt-[94px]" : "pt-0")}>
              {localSearch.trim() ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
                  <div className="mx-auto max-w-[1120px] space-y-5">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h2 className="text-[1.05rem] font-semibold text-slate-900">Conversations</h2>
                        <p className="text-sm text-slate-500">Results in direct messages and spaces</p>
                      </div>
                      <span className="text-sm font-medium text-slate-500">Most relevant</span>
                    </div>

                    {effectiveSearchResults.messages.length === 0 &&
                    effectiveSearchResults.files.length === 0 &&
                    effectiveSearchResults.users.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
                        No matching results for &quot;{localSearch.trim()}&quot;.
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[1.75rem] border border-[#eee6ff] bg-white shadow-[0_18px_50px_rgba(190,180,235,0.12)]">
                        {effectiveSearchResults.messages.map((item: { id: string; body: string; threadId: string; threadLabel: string; createdAt?: string | Date | null }, index: number) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openSearchResultThread(item.threadId)}
                            className={cn(
                              "flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition hover:bg-[#f7f4ff]",
                              index !== 0 ? "border-t border-slate-100" : "",
                              index === 0 ? "bg-[#eee7ff]" : "bg-white"
                            )}
                          >
                            <div className="min-w-0 flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <MessageSquareDot className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[1.02rem] font-semibold text-slate-900">{item.threadLabel}</p>
                                <p className="mt-1 line-clamp-2 text-[0.95rem] leading-7 text-slate-700">
                                  {highlightSearchText(item.body, localSearch.trim())}
                                </p>
                              </div>
                            </div>
                            {item.createdAt ? (
                              <span className="shrink-0 text-sm text-slate-500">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            ) : null}
                          </button>
                        ))}

                        {effectiveSearchResults.files.map((item: { id: string; fileName: string; mimeType?: string; threadId: string; threadLabel: string }) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openSearchResultThread(item.threadId)}
                            className="flex w-full items-start gap-4 border-t border-slate-100 bg-white px-6 py-5 text-left transition hover:bg-[#f7f4ff]"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <Inbox className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[1.02rem] font-semibold text-slate-900">{item.threadLabel}</p>
                              <p className="mt-1 text-[0.95rem] text-slate-700">
                                {highlightSearchText(item.fileName, localSearch.trim())}
                              </p>
                            </div>
                          </button>
                        ))}

                        {effectiveSearchResults.users.map((item: { id: string; name: string; avatarUrl: string | null; role?: string | null; threadId: string; threadLabel: string }) => (
                          <button
                            key={`${item.id}-${item.threadId}`}
                            type="button"
                            onClick={() => openSearchResultThread(item.threadId)}
                            className="flex w-full items-start gap-4 border-t border-slate-100 bg-white px-6 py-5 text-left transition hover:bg-[#f7f4ff]"
                          >
                            <UserAvatar name={item.name} avatarUrl={item.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-[1.02rem] font-semibold text-slate-900">{item.threadLabel}</p>
                              <p className="mt-1 text-[0.95rem] text-slate-700">
                                {highlightSearchText(item.name, localSearch.trim())}
                                {item.role ? <span className="text-slate-500">{` • ${item.role}`}</span> : null}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              <div className="min-h-0 flex-1">
              <LiveMessageThreadPane
                key={`${selectedThread.thread.id}-${requestedConversationMode}`}
                dockTopSearchInHeader={!localSearch.trim()}
                showRealtimeActions={headerSelectionMode === "thread" && paneConversationMode === "conversation"}
                session={{
                  id: session.id,
                  name: session.name,
                  avatarUrl: session.avatarUrl,
                  userType: session.userType,
                  roles: session.roles,
                }}
                activeTab={activeTab}
                initialConversationMode={paneConversationMode}
                setActiveTab={(tab) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", tab);
                  window.history.pushState({}, "", url.toString());
                }}
                notice={notice ?? null}
                setNotice={() => {}}
                workspace={{
                  thread: {
                    id: selectedThread.thread.id,
                    title: selectedThread.thread.title,
                    channelImageUrl: selectedThread.thread.channelImageUrl ?? null,
                    workspaceKey: (selectedThread.thread as { workspaceKey?: string | null }).workspaceKey ?? null,
                    workspaceLabel: (selectedThread.thread as { workspaceLabel?: string | null }).workspaceLabel ?? null,
                    threadType: selectedThread.thread.threadType,
                    displayName: selectedThread.displayName,
                    isDirectMessage: selectedThread.isDirectMessage,
                    participantCount: selectedThread.participantCount,
                    primaryParticipant: normalizedSelectedThreadPrimaryParticipant
                      ? {
                          id: normalizedSelectedThreadPrimaryParticipant.id,
                          name: normalizedSelectedThreadPrimaryParticipant.name,
                          avatarUrl: normalizedSelectedThreadPrimaryParticipant.avatarUrl ?? null,
                          isOnline: normalizedSelectedThreadPrimaryParticipant.isOnline,
                        }
                      : null,
                    followedByCurrentUser: selectedThread.followedByCurrentUser,
                    pinnedCount: selectedThread.pinnedCount,
                    savedCount: selectedThread.savedCount,
                    workOrderId: selectedThread.thread.workOrderId,
                    workOrder: selectedThread.thread.workOrder
                      ? {
                          id: selectedThread.thread.workOrder.id,
                          workOrderNumber: selectedThread.thread.workOrder.workOrderNumber,
                          status: selectedThread.thread.workOrder.status,
                          dueDate: selectedThread.thread.workOrder.dueDate?.toISOString() ?? null,
                          property: {
                            addressLine1: selectedThread.thread.workOrder.addressLine1,
                            city: selectedThread.thread.workOrder.city,
                            state: selectedThread.thread.workOrder.state,
                            postalCode: selectedThread.thread.workOrder.postalCode,
                          },
                          client: {
                            name: selectedThread.thread.workOrder.client.name,
                          },
                          assignments: [],
                          services: [],
                        }
                      : null,
                  },
                  activeCall: selectedThread.activeCall
                    ? {
                        id: selectedThread.activeCall.id,
                        roomName: selectedThread.activeCall.roomName,
                        title: selectedThread.activeCall.title,
                        mode: selectedThread.activeCall.mode,
                        status: selectedThread.activeCall.status,
                        startedAt: selectedThread.activeCall.startedAt.toISOString(),
                        endedAt: selectedThread.activeCall.endedAt?.toISOString() ?? null,
                        createdByUser: selectedThread.activeCall.createdByUser
                          ? {
                              id: selectedThread.activeCall.createdByUser.id,
                              name: selectedThread.activeCall.createdByUser.name,
                              avatarUrl: selectedThread.activeCall.createdByUser.avatarUrl ?? null,
                            }
                          : null,
                        participants: selectedThread.activeCall.participants.map((participant) => ({
                          id: participant.id,
                          userId: participant.userId,
                          name: participant.name,
                          avatarUrl: participant.avatarUrl ?? null,
                          joinedAt: participant.joinedAt.toISOString(),
                          leftAt: participant.leftAt?.toISOString() ?? null,
                          lastSeenAt: participant.lastSeenAt.toISOString(),
                          micEnabled: participant.micEnabled,
                          cameraEnabled: participant.cameraEnabled,
                        })),
                      }
                    : null,
                  members: normalizedSelectedThreadMembers,
                  timeline: (selectedThread.timeline || []).map((item) => ({
                    id: item.id,
                    threadId: item.threadId,
                    parentMessageId: item.parentMessageId,
                    visibilityScope: item.visibilityScope,
                    messageType: item.messageType,
                    authorType: item.authorType,
                    subject: item.subject,
                    body: item.body,
                    expiresAt: (item as { expiresAt?: Date | string | null }).expiresAt instanceof Date ? (item as { expiresAt?: Date }).expiresAt?.toISOString() ?? null : (item as { expiresAt?: string | null }).expiresAt ?? null,
                    isUnread: item.isUnread,
                    isPinned: item.isPinned,
                    isSaved: item.isSaved,
                    requiresResponse: item.requiresResponse,
                    resolvedAt: item.resolvedAt?.toISOString() ?? null,
                    createdAt: item.createdAt.toISOString(),
                    updatedAt: item.updatedAt.toISOString(),
                    createdByUser: item.createdByUser
                      ? {
                          id: item.createdByUser.id,
                          name: item.createdByUser.name,
                          avatarUrl: item.createdByUser.avatarUrl ?? null,
                          isOnline: item.createdByUser.isOnline,
                        }
                      : null,
                    mentions: (item.mentions || []).map((mention) => ({
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
                    attachments: (item.attachments || []).map((attachment) => ({
                      id: attachment.id,
                      fileName: attachment.fileName,
                      mimeType: attachment.mimeType,
                      mediaAssetId: attachment.mediaAssetId,
                      isImage: attachment.isImage,
                    })),
                  })),
                  mentionableUsers: normalizedSelectedThreadMentionableUsers,
                  threadAttachments: (selectedThread.threadAttachments || []).map((attachment) => ({
                    ...attachment,
                    createdAt: attachment.createdAt.toISOString(),
                    versions: (attachment.versions || []).map((version) => ({
                      ...version,
                      createdAt: version.createdAt.toISOString(),
                    })),
                  })),
                  notificationPreferences: selectedThread.notificationPreferences || {
                    global: {
                      notifyOnMentions: true,
                      notifyOnKeywords: true,
                      keywordList: null,
                      dndEnabled: false,
                      dndStartMinutes: null,
                      dndEndMinutes: null,
                    },
                    thread: {
                      level: "ALL",
                      mutedUntil: null,
                      snoozedUntil: null,
                      customKeywords: null,
                    },
                  },
                  sharedNotes: (selectedThread.sharedNotes || []).map((note) => ({
                    ...note,
                    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
                    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
                  })),
                  polls: (selectedThread.polls || []).map((poll) => ({
                    ...poll,
                    closesAt: poll.closesAt instanceof Date ? poll.closesAt.toISOString() : poll.closesAt ?? null,
                    createdAt: poll.createdAt instanceof Date ? poll.createdAt.toISOString() : poll.createdAt,
                    options: (poll.options || []).map((option) => ({
                      ...option,
                      votes: (option.votes || []).map((vote) => ({
                        ...vote,
                        createdAt: vote.createdAt instanceof Date ? vote.createdAt.toISOString() : vote.createdAt,
                      })),
                    })),
                  })),
                  meetings: (selectedThread.meetings || []).map((meeting) => ({
                    ...meeting,
                    startsAt: meeting.startsAt instanceof Date ? meeting.startsAt.toISOString() : meeting.startsAt,
                    endsAt: meeting.endsAt instanceof Date ? meeting.endsAt.toISOString() : meeting.endsAt,
                    createdAt: meeting.createdAt instanceof Date ? meeting.createdAt.toISOString() : meeting.createdAt,
                  })),
                  bots: (selectedThread.bots || []).map((bot) => ({
                    ...bot,
                    nextRunAt: bot.nextRunAt instanceof Date ? bot.nextRunAt.toISOString() : bot.nextRunAt ?? null,
                    lastRunAt: bot.lastRunAt instanceof Date ? bot.lastRunAt.toISOString() : bot.lastRunAt ?? null,
                    createdAt: bot.createdAt instanceof Date ? bot.createdAt.toISOString() : bot.createdAt,
                  })),
                  integrations: (selectedThread.integrations || []).map((integration) => ({
                    ...integration,
                    createdAt: integration.createdAt instanceof Date ? integration.createdAt.toISOString() : integration.createdAt,
                  })),
                  webhooks: (selectedThread.webhooks || []).map((webhook) => ({
                    ...webhook,
                    lastTriggeredAt: webhook.lastTriggeredAt instanceof Date ? webhook.lastTriggeredAt.toISOString() : webhook.lastTriggeredAt ?? null,
                    createdAt: webhook.createdAt instanceof Date ? webhook.createdAt.toISOString() : webhook.createdAt,
                  })),
                  guestInvites: ((selectedThread as { guestInvites?: Array<Record<string, unknown>> }).guestInvites || []).map((guest) => ({
                    ...guest,
                    invitedAt: guest.invitedAt instanceof Date ? guest.invitedAt.toISOString() : guest.invitedAt,
                    expiresAt: guest.expiresAt instanceof Date ? guest.expiresAt.toISOString() : guest.expiresAt ?? null,
                    acceptedAt: guest.acceptedAt instanceof Date ? guest.acceptedAt.toISOString() : guest.acceptedAt ?? null,
                  })),
                  aiSummary: selectedThread.aiSummary,
                  spaceTasks: (selectedThread.spaceTasks || []).map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    dueAt: task.dueAt?.toISOString() ?? null,
                    assignedToUser: task.assignedToUser,
                    createdByUser: task.createdByUser,
                    completedByUser: task.completedByUser,
                    approvedByUser: task.approvedByUser,
                    completedAt: task.completedAt?.toISOString() ?? null,
                    approvedAt: task.approvedAt?.toISOString() ?? null,
                    createdAt: task.createdAt.toISOString(),
                    updatedAt: task.updatedAt.toISOString(),
                  })),
                  availableComposeScopes: selectedThread.availableComposeScopes || [],
                }}
              />
              </div>
              )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center px-10">
                <div className="max-w-md text-center">
                  <p className="text-2xl font-semibold text-slate-800">Choose a conversation</p>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Select a thread from the center column to load its conversation, profile, and history with real work-order context.
                  </p>
                </div>
              </div>
            )}
          </section>
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
