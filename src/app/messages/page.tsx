import { requireAppSession } from "@/lib/app-session";
import {
  getMessagingAccessContext,
  getMessageThreadWorkspace,
  getMessagingInboxWorkspace,
} from "@/modules/messaging";
import { MessagePageFrame } from "@/modules/messaging/ui/message-page-frame";

type MessagesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const session = await requireAppSession();
  const context = await getMessagingAccessContext(session.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const view =
    typeof resolvedSearchParams.view === "string" &&
    ["all", "mentions", "unread", "needs-response", "contractor", "client", "system", "pinned", "saved", "following"].includes(resolvedSearchParams.view)
      ? (resolvedSearchParams.view as "all" | "mentions" | "unread" | "needs-response" | "contractor" | "client" | "system" | "pinned" | "saved" | "following")
      : "all";
  const threadId = typeof resolvedSearchParams.thread === "string" ? resolvedSearchParams.thread : null;
  const tab =
    typeof resolvedSearchParams.tab === "string" &&
    ["conversation", "profile", "history"].includes(resolvedSearchParams.tab)
      ? (resolvedSearchParams.tab as "conversation" | "profile" | "history")
      : "conversation";
  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const searchFilters = {
    from: typeof resolvedSearchParams.from === "string" ? resolvedSearchParams.from : "",
    saidIn: typeof resolvedSearchParams.saidIn === "string" ? resolvedSearchParams.saidIn : "",
    startDate: typeof resolvedSearchParams.startDate === "string" ? resolvedSearchParams.startDate : "",
    endDate: typeof resolvedSearchParams.endDate === "string" ? resolvedSearchParams.endDate : "",
    hasFile: typeof resolvedSearchParams.hasFile === "string" ? resolvedSearchParams.hasFile : "",
    hasLink: resolvedSearchParams.hasLink === "1",
    mentionedMe: resolvedSearchParams.mentionedMe === "1",
    onlyConversationsImIn: resolvedSearchParams.onlyMine === "1",
  };
  const notice = typeof resolvedSearchParams.notice === "string" ? resolvedSearchParams.notice : undefined;
  const initialConversationMode =
    typeof resolvedSearchParams.mode === "string" && resolvedSearchParams.mode === "ai"
      ? "ai"
      : "conversation";

  if (!context) {
    return null;
  }

  const workspace = await getMessagingInboxWorkspace({ context, view, search, filters: searchFilters });
  const resolvedThreadId = threadId ?? workspace.threads[0]?.id ?? null;
  const selectedThread = resolvedThreadId
    ? await getMessageThreadWorkspace({ context, threadId: resolvedThreadId })
    : null;

  return (
    <MessagePageFrame
      session={session}
      workspace={workspace}
      selectedThreadId={resolvedThreadId}
      selectedThread={selectedThread}
      activeTab={tab}
      initialConversationMode={initialConversationMode}
      notice={notice}
    />
  );
}
