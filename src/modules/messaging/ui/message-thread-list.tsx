import Link from "next/link";

type MessageThreadSummary = {
  id: string;
  title: string;
  threadType: string;
  unreadCount: number;
  needsResponseCount: number;
  hasPinned: boolean;
  contractorVisibleCount: number;
  clientVisibleCount: number;
  systemCount: number;
  lastMessageAt: Date;
  workOrder: {
    id: string;
    number: string;
    addressLine1: string;
    city: string;
    state: string;
  } | null;
  latestMessage: {
    id: string;
    body: string;
    subject: string | null;
    visibilityScope: string;
    messageType: string;
    createdAt: Date;
    createdByUser: { name: string } | null;
  } | null;
};

type MessageThreadListProps = {
  threads: MessageThreadSummary[];
  basePath: string;
  emptyTitle: string;
  emptyDescription: string;
};

export function MessageThreadList({
  threads,
  basePath,
  emptyTitle,
  emptyDescription
}: MessageThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(99,207,255,0.18)] bg-white/70 px-5 py-8 text-center">
        <p className="font-semibold text-slate-950">{emptyTitle}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`${basePath}/${thread.id}`}
          className="block rounded-[1.4rem] border border-[rgba(99,207,255,0.14)] bg-white/78 px-5 py-4 shadow-[0_18px_40px_rgba(9,18,43,0.06)] transition hover:border-[rgba(56,189,248,0.26)] hover:bg-[rgba(248,252,255,0.96)]"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[rgba(9,18,43,0.06)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {thread.threadType.replaceAll("_", " ")}
                </span>
                {thread.hasPinned ? (
                  <span className="rounded-full bg-[rgba(245,158,11,0.12)] px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                    Pinned
                  </span>
                ) : null}
                {thread.unreadCount > 0 ? (
                  <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                    {thread.unreadCount} unread
                  </span>
                ) : null}
                {thread.needsResponseCount > 0 ? (
                  <span className="rounded-full bg-[rgba(244,63,94,0.12)] px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                    {thread.needsResponseCount} needs response
                  </span>
                ) : null}
              </div>

              <p className="mt-3 font-semibold text-slate-950">{thread.title}</p>
              {thread.workOrder ? (
                <p className="mt-1 text-sm text-slate-500">
                  {thread.workOrder.number} • {thread.workOrder.addressLine1}, {thread.workOrder.city}, {thread.workOrder.state}
                </p>
              ) : null}
              {thread.latestMessage ? (
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  <p className="font-medium text-slate-900">
                    {thread.latestMessage.subject ?? thread.latestMessage.createdByUser?.name ?? "Latest update"}
                  </p>
                  <p className="mt-1 line-clamp-2">{thread.latestMessage.body}</p>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 text-right text-xs text-slate-500">
              <p>{thread.lastMessageAt.toLocaleString()}</p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {thread.contractorVisibleCount > 0 ? (
                  <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-2.5 py-1 font-semibold text-sky-800">
                    Contractor
                  </span>
                ) : null}
                {thread.clientVisibleCount > 0 ? (
                  <span className="rounded-full bg-[rgba(139,92,246,0.12)] px-2.5 py-1 font-semibold text-violet-800">
                    Client
                  </span>
                ) : null}
                {thread.systemCount > 0 ? (
                  <span className="rounded-full bg-[rgba(9,18,43,0.06)] px-2.5 py-1 font-semibold text-slate-700">
                    System
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
