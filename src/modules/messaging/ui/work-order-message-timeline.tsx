import Link from "next/link";
import { MessageCircleReply, Paperclip, Pin } from "lucide-react";
import { MessageType, MessageVisibilityScope } from "@prisma/client";
import {
  createMessageEscalationAction,
  markThreadReadAction,
  markThreadUnreadAction,
  resolveMessageEscalationAction,
  toggleMessageResolvedAction
} from "@/app/messages/actions";
import { toggleWorkOrderMessagePinAction } from "@/app/work-orders/actions";
import { MessageTypeBadge } from "@/modules/messaging/ui/message-type-badge";
import { MessageVisibilityBadge } from "@/modules/messaging/ui/message-visibility-badge";

type TimelineItem = {
  id: string;
  threadId: string;
  threadTitle: string;
  threadType: string;
  parentMessageId: string | null;
  visibilityScope: MessageVisibilityScope;
  messageType: MessageType;
  authorType: string;
  urgency: string;
  subject: string | null;
  body: string;
  requiresResponse: boolean;
  responseDueAt: Date | null;
  assignedResponder: { name: string } | null;
  isPinned: boolean;
  isUnread: boolean;
  createdAt: Date;
  createdByUser: { name: string } | null;
  parentMessage: { id: string; body: string; createdByUser: { name: string } | null } | null;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    mediaAsset: { id: string; fileName: string } | null;
  }>;
  escalations?: Array<{
    id: string;
    status: string;
    urgency: string;
    reason: string;
    escalatedByUser: { id: string; name: string } | null;
    escalatedToUser: { id: string; name: string } | null;
    resolvedByUser: { id: string; name: string } | null;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
};

type WorkOrderMessageTimelineProps = {
  workOrderId: string;
  items: TimelineItem[];
  firstUnreadId: string | null;
  activeFilter: string;
  threadId?: string;
  replyBasePath?: string;
  actionBasePath?: string;
  allowStateActions?: boolean;
  showThreadReadActions?: boolean;
};

export function WorkOrderMessageTimeline({
  workOrderId,
  items,
  firstUnreadId,
  activeFilter,
  threadId,
  replyBasePath,
  actionBasePath,
  allowStateActions = false,
  showThreadReadActions = false
}: WorkOrderMessageTimelineProps) {
  const resolvedActionBasePath = actionBasePath ?? "/messages";
  const resolvedReplyBasePath = replyBasePath ?? (threadId ? `${resolvedActionBasePath}/${threadId}` : `/work-orders/${workOrderId}`);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[rgba(99,207,255,0.18)] bg-white/70 px-5 py-8 text-center text-sm text-slate-500">
        No messages match the current filter yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showThreadReadActions && threadId ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form action={markThreadReadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="redirectBasePath" value={resolvedActionBasePath} />
            <button className="rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-[rgba(56,189,248,0.2)]">
              Mark thread read
            </button>
          </form>
          <form action={markThreadUnreadAction}>
            <input type="hidden" name="threadId" value={threadId} />
            <input type="hidden" name="redirectBasePath" value={resolvedActionBasePath} />
            <button className="rounded-full bg-[rgba(9,18,43,0.06)] px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[rgba(9,18,43,0.12)]">
              Mark thread unread
            </button>
          </form>
        </div>
      ) : null}

      {items.map((item) => {
        const escalations = item.escalations ?? [];

        return (
        <div key={item.id}>
          {firstUnreadId === item.id ? (
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(56,189,248,0.2)]" />
              <span className="rounded-full bg-[rgba(56,189,248,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                Unread messages
              </span>
              <div className="h-px flex-1 bg-[rgba(56,189,248,0.2)]" />
            </div>
          ) : null}

          <div
            className={`rounded-[1.5rem] border px-5 py-4 shadow-[0_18px_40px_rgba(9,18,43,0.06)] ${
              item.messageType === "SYSTEM_EVENT"
                ? "border-[rgba(139,92,246,0.16)] bg-[rgba(245,243,255,0.78)]"
                : item.isUnread
                  ? "border-[rgba(56,189,248,0.22)] bg-[rgba(240,249,255,0.78)]"
                  : "border-[rgba(99,207,255,0.14)] bg-white/78"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageTypeBadge type={item.messageType} />
                  <MessageVisibilityBadge scope={item.visibilityScope} />
                  {item.isPinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(245,158,11,0.12)] px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  ) : null}
                  {item.requiresResponse ? (
                    <span className="inline-flex rounded-full bg-[rgba(244,63,94,0.12)] px-2.5 py-1 text-[11px] font-semibold text-rose-800">
                      Needs response
                    </span>
                  ) : null}
                  <span className="rounded-full bg-[rgba(9,18,43,0.06)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {item.threadTitle}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {item.createdByUser?.name ?? item.authorType} • {item.createdAt.toLocaleString()}
                </p>
                {item.subject ? (
                  <p className="mt-2 font-semibold text-slate-950">{item.subject}</p>
                ) : null}
                {item.parentMessage ? (
                  <div className="mt-3 rounded-2xl border border-[rgba(99,207,255,0.12)] bg-[rgba(248,252,255,0.9)] px-3 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">
                      Replying to {item.parentMessage.createdByUser?.name ?? "Earlier message"}
                    </p>
                    <p className="mt-1 line-clamp-2">{item.parentMessage.body}</p>
                  </div>
                ) : null}
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</div>

                {item.attachments.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.attachments.map((attachment) => (
                      <Link
                        key={attachment.id}
                        href={`/messages/attachments/${attachment.id}`}
                        className="inline-flex items-center gap-2 rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1.5 text-xs font-medium text-sky-800 transition hover:bg-[rgba(56,189,248,0.2)]"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachment.fileName}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {item.requiresResponse ? (
                  <div className="mt-4 rounded-2xl bg-[rgba(9,18,43,0.04)] px-3 py-3 text-sm text-slate-600">
                    <p>
                      Response due:{" "}
                      <span className="font-semibold text-slate-900">
                        {item.responseDueAt ? item.responseDueAt.toLocaleString() : "Not set"}
                      </span>
                    </p>
                    {item.assignedResponder ? (
                      <p className="mt-1">
                        Assigned responder: <span className="font-semibold text-slate-900">{item.assignedResponder.name}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {escalations.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {escalations.map((escalation) => (
                      <div
                        key={escalation.id}
                        className="rounded-2xl border border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.86)] px-3 py-3 text-sm text-slate-700"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[rgba(245,158,11,0.14)] px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                            {escalation.status}
                          </span>
                          <span className="rounded-full bg-[rgba(9,18,43,0.06)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {escalation.urgency}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-slate-900">{escalation.reason}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {escalation.escalatedByUser?.name ?? "Unknown"} • {escalation.createdAt.toLocaleString()}
                          {escalation.escalatedToUser ? ` • Assigned to ${escalation.escalatedToUser.name}` : ""}
                        </p>
                        {allowStateActions && escalation.status === "OPEN" ? (
                          <form action={resolveMessageEscalationAction} className="mt-3">
                            <input type="hidden" name="escalationId" value={escalation.id} />
                            <input type="hidden" name="threadId" value={threadId ?? item.threadId} />
                            <input type="hidden" name="redirectBasePath" value={resolvedActionBasePath} />
                            <button className="rounded-full bg-[rgba(34,197,94,0.14)] px-3 py-1.5 text-xs font-semibold text-emerald-800">
                              Resolve escalation
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Link
                  href={`${resolvedReplyBasePath}${resolvedReplyBasePath.includes("?") ? "&" : "?"}replyTo=${item.id}${
                    !threadId && workOrderId ? `&section=messages&messageFilter=${activeFilter}&threadId=${item.threadId}` : ""
                  }`}
                  className="inline-flex items-center gap-2 rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-[rgba(56,189,248,0.2)]"
                >
                  <MessageCircleReply className="h-3.5 w-3.5" />
                  Reply
                </Link>
                <form action={toggleWorkOrderMessagePinAction}>
                  <input type="hidden" name="workOrderId" value={workOrderId} />
                  <input type="hidden" name="messageId" value={item.id} />
                  <button className="inline-flex items-center gap-2 rounded-full bg-[rgba(9,18,43,0.06)] px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[rgba(245,158,11,0.16)] hover:text-amber-800">
                    <Pin className="h-3.5 w-3.5" />
                    {item.isPinned ? "Unpin" : "Pin"}
                  </button>
                </form>
                {allowStateActions && item.requiresResponse ? (
                  <form action={toggleMessageResolvedAction}>
                    <input type="hidden" name="messageId" value={item.id} />
                    <input type="hidden" name="threadId" value={threadId ?? item.threadId} />
                    <input type="hidden" name="redirectBasePath" value={resolvedActionBasePath} />
                    <button className="inline-flex items-center gap-2 rounded-full bg-[rgba(34,197,94,0.12)] px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-[rgba(34,197,94,0.18)]">
                      {item.resolvedAt ? "Reopen" : "Resolve"}
                    </button>
                  </form>
                ) : null}
                {allowStateActions && escalations.every((escalation) => escalation.status !== "OPEN") ? (
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-full bg-[rgba(245,158,11,0.12)] px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-[rgba(245,158,11,0.18)]">
                      Escalate
                    </summary>
                    <form action={createMessageEscalationAction} className="mt-3 w-64 rounded-2xl border border-[rgba(245,158,11,0.18)] bg-white p-3 shadow-[0_18px_40px_rgba(9,18,43,0.08)]">
                      <input type="hidden" name="messageId" value={item.id} />
                      <input type="hidden" name="threadId" value={threadId ?? item.threadId} />
                      <input type="hidden" name="redirectBasePath" value={resolvedActionBasePath} />
                      <label className="grid gap-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">Reason</span>
                        <textarea
                          name="reason"
                          required
                          className="min-h-20 rounded-xl border border-[rgba(16,26,56,0.12)] px-3 py-2 text-sm text-slate-900 outline-none"
                          placeholder="Why this message needs escalation"
                        />
                      </label>
                      <label className="mt-2 grid gap-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">Urgency</span>
                        <select name="urgency" className="rounded-xl border border-[rgba(16,26,56,0.12)] px-3 py-2 text-sm text-slate-900 outline-none">
                          <option value="NORMAL">NORMAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="URGENT">URGENT</option>
                        </select>
                      </label>
                      <button className="mt-3 rounded-full bg-[var(--cyan-500)] px-3 py-1.5 text-xs font-semibold text-[var(--navy-950)]">
                        Open escalation
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
