"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";

type SupportTicketSummary = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  createdByUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
  assignedToUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  } | null;
  closedByUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  } | null;
  _count: {
    comments: number;
  };
};

type SupportTicketComment = {
  id: string;
  body: string;
  isSystem: boolean;
  createdAt: string;
  createdByUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
  };
};

type SupportTicketDetail = SupportTicketSummary & {
  comments: SupportTicketComment[];
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function statusTone(status: SupportTicketSummary["status"]) {
  switch (status) {
    case "OPEN":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "CLOSED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function priorityTone(priority: SupportTicketSummary["priority"]) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LOW":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

export function SupportCenter() {
  useSession();
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("MEDIUM");
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [permissions, setPermissions] = useState({ canClose: false });

  const metrics = useMemo(() => {
    return {
      open: tickets.filter((ticket) => ticket.status === "OPEN").length,
      inProgress: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length,
      closed: tickets.filter((ticket) => ticket.status === "CLOSED").length,
      total: tickets.length,
    };
  }, [tickets]);

  async function loadTickets(preferredId?: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/support/tickets", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to load support tickets.");
        return;
      }

      const nextTickets = Array.isArray(payload.tickets) ? payload.tickets : [];
      setTickets(nextTickets);
      setPermissions({ canClose: Boolean(payload.permissions?.canClose) });

      const targetId = preferredId ?? activeTicket?.id ?? nextTickets[0]?.id;
      if (targetId) {
        await loadTicket(targetId);
      } else {
        setActiveTicket(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadTicket(ticketId: string) {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to load ticket details.");
        return;
      }
      setActiveTicket(payload.ticket ?? null);
      setPermissions({ canClose: Boolean(payload.permissions?.canClose) });
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void loadTickets();
    // Intentionally load once on mount for the ticket center.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateTicket() {
    if (!subject.trim() || !description.trim()) {
      setNotice("Subject and description are required.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          priority,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to create support ticket.");
        return;
      }

      setSubject("");
      setDescription("");
      setPriority("MEDIUM");
      setShowCreate(false);
      setNotice("Support ticket created.");
      await loadTickets(payload.ticket?.id);
    } finally {
      setCreating(false);
    }
  }

  async function handleReply() {
    if (!activeTicket || !reply.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          body: reply.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to send reply.");
        return;
      }

      setReply("");
      await loadTickets(activeTicket.id);
    } finally {
      setSendingReply(false);
    }
  }

  async function handleCloseTicket() {
    if (!activeTicket) return;

    setClosingTicket(true);
    try {
      const response = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotice(payload.error ?? "Unable to close ticket.");
        return;
      }

      setNotice("Ticket closed.");
      await loadTickets(activeTicket.id);
    } finally {
      setClosingTicket(false);
    }
  }

  return (
    <div className="space-y-6 text-[#435072]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#2b3159]">Support Tickets</h2>
          <p className="mt-1 text-sm text-[#7280ad]">
            Create and manage support requests. Admins and coordinators can close tickets once resolved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#ff7a49_0%,#ff6b3c_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(255,122,73,0.22)]"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#ff8d7d]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7280ad]">Open</p>
              <p className="text-xl font-bold text-[#2b3159]">{metrics.open}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-[#ffd08a]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7280ad]">In Progress</p>
              <p className="text-xl font-bold text-[#2b3159]">{metrics.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#7ee0a6]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7280ad]">Closed</p>
              <p className="text-xl font-bold text-[#2b3159]">{metrics.closed}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-[#e3dcff] bg-[linear-gradient(180deg,#ffffff_0%,#f8f4ff_100%)] p-5 shadow-[0_16px_36px_rgba(196,186,255,0.14)]">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#8fb0ff]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7280ad]">Total</p>
              <p className="text-xl font-bold text-[#2b3159]">{metrics.total}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-[28px] border border-[#e3dcff] bg-white/90 p-4 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#2b3159]">Tickets</h3>
              <p className="text-sm text-[#7280ad]">
                {permissions.canClose ? "All support tickets" : "Your submitted tickets"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-[#dccfff] px-4 py-12 text-center text-sm text-[#7280ad]">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dccfff] px-4 py-12 text-center text-sm text-[#7280ad]">
              No support tickets yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => void loadTicket(ticket.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    activeTicket?.id === ticket.id
                      ? "border-violet-300 bg-violet-50 shadow-[0_12px_24px_rgba(180,166,255,0.14)]"
                      : "border-[#ece2ff] bg-white hover:border-violet-200 hover:bg-violet-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a86c4]">{ticket.ticketNumber}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#2b3159]">{ticket.subject}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(ticket.status)}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-[#7280ad]">{ticket.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#8792b6]">
                    <span>{ticket.createdByUser.name}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-[#e3dcff] bg-white/90 p-5 shadow-[0_18px_40px_rgba(196,186,255,0.14)]">
          {activeTicket ? (
            <>
              <div className="flex flex-col gap-4 border-b border-[#efe7ff] pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                      {activeTicket.ticketNumber}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(activeTicket.status)}`}>
                      {activeTicket.status.replace("_", " ")}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityTone(activeTicket.priority)}`}>
                      {activeTicket.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-[#2b3159]">{activeTicket.subject}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#7280ad]">{activeTicket.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8792b6]">
                    <span>Opened by {activeTicket.createdByUser.name}</span>
                    <span>Created {formatDateTime(activeTicket.createdAt)}</span>
                    <span>Updated {formatDateTime(activeTicket.updatedAt)}</span>
                    {activeTicket.closedAt ? <span>Closed {formatDateTime(activeTicket.closedAt)}</span> : null}
                  </div>
                </div>
                {permissions.canClose && activeTicket.status !== "CLOSED" ? (
                  <button
                    type="button"
                    onClick={() => void handleCloseTicket()}
                    disabled={closingTicket}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {closingTicket ? "Closing..." : "Close Ticket"}
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a86c4]">Conversation</h4>
                  <span className="text-xs text-[#8792b6]">{activeTicket.comments.length} updates</span>
                </div>

                {loadingDetail ? (
                  <div className="rounded-2xl border border-dashed border-[#dccfff] px-4 py-12 text-center text-sm text-[#7280ad]">
                    Loading conversation...
                  </div>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {activeTicket.comments.map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-[#ece2ff] bg-[linear-gradient(180deg,#ffffff_0%,#fbf8ff_100%)] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#2b3159]">
                              {comment.createdByUser.name}
                              <span className="ml-2 text-xs font-medium text-[#8792b6]">{comment.createdByUser.role}</span>
                            </p>
                          </div>
                          <span className="text-xs text-[#8792b6]">{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${comment.isSystem ? "font-medium text-violet-700" : "text-[#4e587f]"}`}>
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeTicket.status !== "CLOSED" ? (
                <div className="mt-5 rounded-3xl border border-[#e3dcff] bg-[linear-gradient(180deg,#fffefe_0%,#fbf7ff_100%)] p-4">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Write an update or response..."
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-[#ece2ff] bg-white px-4 py-3 text-sm text-[#2b3159] outline-none focus:border-violet-300"
                  />
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => void handleReply()}
                      disabled={sendingReply || !reply.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-4 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#dccfff] px-4 py-20 text-center text-sm text-[#7280ad]">
              Select a ticket to view the conversation.
            </div>
          )}
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#170f2d]/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-[#e3dcff] bg-white p-6 shadow-[0_28px_60px_rgba(145,160,204,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#2b3159]">Create Support Ticket</h3>
                <p className="mt-1 text-sm text-[#7280ad]">
                  Tell the office team what you need help with.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-full p-2 text-[#7280ad] transition hover:bg-slate-100 hover:text-[#2b3159]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ticket subject"
                className="w-full rounded-2xl border border-[#ece2ff] bg-white px-4 py-3 text-sm text-[#2b3159] outline-none focus:border-violet-300"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the issue or request"
                rows={6}
                className="w-full resize-none rounded-2xl border border-[#ece2ff] bg-white px-4 py-3 text-sm text-[#2b3159] outline-none focus:border-violet-300"
              />
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as (typeof PRIORITIES)[number])}
                className="w-full rounded-2xl border border-[#ece2ff] bg-white px-4 py-3 text-sm text-[#2b3159] outline-none focus:border-violet-300"
              >
                {PRIORITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateTicket()}
                disabled={creating}
                className="rounded-2xl bg-[linear-gradient(135deg,#f9d2f5_0%,#d79bf5_45%,#82a8ff_100%)] px-4 py-2 text-sm font-semibold text-[#2b3159] shadow-[0_10px_22px_rgba(196,156,255,0.22)] transition hover:opacity-95 disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
