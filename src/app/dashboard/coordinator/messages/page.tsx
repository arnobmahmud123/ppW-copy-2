import { requireAppSession } from "@/lib/app-session";
import {
  getMessagingAccessContext,
  getMessageThreadWorkspace,
  getMessagingInboxWorkspace,
} from "@/modules/messaging";
import { MessageDashboardFrame } from "@/modules/messaging/ui/message-dashboard-frame";

type MessagesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoordinatorMessagesPage({ searchParams }: MessagesPageProps) {
  const session = await requireAppSession();
  const context = await getMessagingAccessContext(session.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const view =
    typeof resolvedSearchParams.view === "string" &&
    ["all", "mentions", "unread", "needs-response", "contractor", "client", "system", "pinned", "saved", "following"].includes(resolvedSearchParams.view)
      ? (resolvedSearchParams.view as "all" | "mentions" | "unread" | "needs-response" | "contractor" | "client" | "system" | "pinned" | "saved" | "following")
      : "all";
  const threadId = typeof resolvedSearchParams.thread === "string" ? resolvedSearchParams.thread : null;
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
  const initialConversationMode =
    typeof resolvedSearchParams.mode === "string" && resolvedSearchParams.mode === "ai"
      ? "ai"
      : "conversation";

  if (!context) {
    return <div className="p-8 text-center text-white">Unable to load messaging context</div>;
  }

  const workspace = await getMessagingInboxWorkspace({ context, view, search, filters: searchFilters });
  const resolvedThreadId = threadId ?? workspace.threads[0]?.id ?? null;
  const selectedThread = resolvedThreadId
    ? await getMessageThreadWorkspace({ context, threadId: resolvedThreadId })
    : null;

  return (
    <MessageDashboardFrame
      session={session}
      workspace={workspace}
      selectedThreadId={resolvedThreadId}
      selectedThread={selectedThread}
      activeTab="conversation"
      initialConversationMode={initialConversationMode}
      notice={undefined}
    />
  );
}
