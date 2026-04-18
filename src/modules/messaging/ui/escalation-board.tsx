"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { addMessageEscalationCommentAction, resolveMessageEscalationAction, updateMessageEscalationAction } from "@/app/messages/actions";

type EscalationItem = {
  id: string;
  urgency: string;
  status: string;
  reason: string;
  targetResponseAt: Date | null;
  escalatedToUserId: string | null;
  createdAt: Date;
  comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    createdByUser: { name: string } | null;
  }>;
  message: {
    messageThreadId: string;
    messageThread: { title: string | null };
    workOrder: { workOrderNumber: string; property: { addressLine1: string } } | null;
  };
  escalatedByUser: { name: string } | null;
};

type OwnerItem = {
  id: string;
  name: string;
  email: string;
};

type EscalationBoardProps = {
  escalations: EscalationItem[];
  owners: OwnerItem[];
  currentUserName?: string;
};

export function EscalationBoard({ escalations, owners, currentUserName = "You" }: EscalationBoardProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localEscalations, setLocalEscalations] = useState(escalations);
  const optimisticCommentCounter = useRef(0);

  useEffect(() => {
    setLocalEscalations(escalations);
  }, [escalations]);

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-[rgba(251,113,133,0.22)] bg-[rgba(255,228,230,0.9)] px-4 py-3 text-sm font-medium text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      {localEscalations.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[rgba(16,26,56,0.14)] bg-white/70 px-6 py-10 text-center text-sm text-slate-600">
          No escalations match the current filters. Try clearing filters or wait for new response-risk messages to enter the desk.
        </div>
      ) : null}

      {localEscalations.map((escalation) => (
        <div key={escalation.id} className="rounded-[1.5rem] border border-[rgba(16,26,56,0.09)] bg-[var(--surface-strong)] p-6 shadow-[0_20px_60px_rgba(9,18,43,0.08)] backdrop-blur app-panel px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[rgba(245,158,11,0.14)] px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                  {escalation.urgency}
                </span>
                <span className="rounded-full bg-[rgba(9,18,43,0.06)] px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  {escalation.status}
                </span>
                {escalation.targetResponseAt ? (
                  <span className="rounded-full bg-[rgba(56,189,248,0.12)] px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                    SLA {new Date(escalation.targetResponseAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-semibold text-slate-950">{escalation.reason}</p>
              <p className="mt-1 text-sm text-slate-600">
                {escalation.message.messageThread.title ?? "Operational thread"} •{" "}
                {escalation.message.workOrder
                  ? `${escalation.message.workOrder.workOrderNumber} • ${escalation.message.workOrder.property.addressLine1}`
                  : "No work order linked"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Opened by {escalation.escalatedByUser?.name ?? "Unknown"} on {new Date(escalation.createdAt).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/messages/${escalation.message.messageThreadId}`} className="app-secondary-button">
                  Open thread
                </Link>
                <form
                  action={async (formData) => {
                    setErrorMessage(null);
                    const previous = localEscalations;
                    setLocalEscalations((current) => current.filter((item) => item.id !== escalation.id));
                    try {
                      await resolveMessageEscalationAction(formData);
                    } catch {
                      setLocalEscalations(previous);
                      setErrorMessage("Escalation resolve failed and the previous desk state was restored.");
                    }
                  }}
                >
                  <input type="hidden" name="escalationId" value={escalation.id} />
                  <input type="hidden" name="threadId" value={escalation.message.messageThreadId} />
                  <input type="hidden" name="redirectBasePath" value="/messages/escalations" />
                  <button className="rounded-full bg-[rgba(34,197,94,0.14)] px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    Resolve
                  </button>
                </form>
              </div>
              </div>

              <div className="grid gap-4 xl:w-[28rem]">
                <form
                  action={async (formData) => {
                    setErrorMessage(null);
                    const targetResponseAtRaw = String(formData.get("targetResponseAt") ?? "").trim();
                    const previous = localEscalations;
                    const nextEscalatedToUserId = String(formData.get("escalatedToUserId") ?? "").trim() || null;
                    const nextTargetResponseAt = targetResponseAtRaw ? new Date(targetResponseAtRaw) : null;
                    setLocalEscalations((current) =>
                      current.map((item) =>
                        item.id === escalation.id
                          ? {
                              ...item,
                              escalatedToUserId: nextEscalatedToUserId,
                              targetResponseAt: nextTargetResponseAt
                            }
                          : item
                      )
                    );
                    try {
                      await updateMessageEscalationAction(formData);
                    } catch {
                      setLocalEscalations(previous);
                      setErrorMessage("Owner or SLA update failed and the previous values were restored.");
                    }
                  }}
                  className="rounded-2xl border border-[rgba(99,207,255,0.12)] bg-white/75 p-4"
                >
                  <input type="hidden" name="escalationId" value={escalation.id} />
                  <input type="hidden" name="threadId" value={escalation.message.messageThreadId} />
                  <input type="hidden" name="redirectBasePath" value="/messages/escalations" />
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ownership and SLA</p>
                  <div className="mt-3 grid gap-3">
                    <label className="grid gap-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">Owner</span>
                      <select
                        name="escalatedToUserId"
                        defaultValue={escalation.escalatedToUserId ?? ""}
                        className="rounded-xl border border-[rgba(16,26,56,0.12)] px-3 py-2 text-sm text-slate-900 outline-none"
                      >
                        <option value="">Unassigned</option>
                        {owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">Target response time</span>
                      <input
                        type="datetime-local"
                        name="targetResponseAt"
                        defaultValue={escalation.targetResponseAt ? new Date(new Date(escalation.targetResponseAt).getTime() - new Date(escalation.targetResponseAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                        className="rounded-xl border border-[rgba(16,26,56,0.12)] px-3 py-2 text-sm text-slate-900 outline-none"
                      />
                    </label>
                    <button className="rounded-full bg-[var(--cyan-500)] px-3 py-2 text-xs font-semibold text-[var(--navy-950)]">
                      Save ownership
                    </button>
                  </div>
                </form>

                <form
                  action={async (formData) => {
                    setErrorMessage(null);
                    const body = String(formData.get("body") ?? "").trim();
                    if (!body) {
                      return;
                    }
                    const previous = localEscalations;
                    optimisticCommentCounter.current += 1;
                    const optimisticId = `optimistic-${escalation.id}-${optimisticCommentCounter.current}`;
                    setLocalEscalations((current) =>
                      current.map((item) =>
                        item.id === escalation.id
                          ? {
                              ...item,
                              comments: [
                                {
                                  id: optimisticId,
                                  body,
                                  createdAt: new Date(),
                                  createdByUser: { name: currentUserName }
                                },
                                ...item.comments
                              ]
                            }
                          : item
                      )
                    );
                    try {
                      await addMessageEscalationCommentAction(formData);
                    } catch {
                      setLocalEscalations(previous);
                      setErrorMessage("Comment save failed and the previous comment timeline was restored.");
                    }
                  }}
                  className="rounded-2xl border border-[rgba(99,207,255,0.12)] bg-white/75 p-4"
                >
                  <input type="hidden" name="escalationId" value={escalation.id} />
                  <input type="hidden" name="redirectBasePath" value="/messages/escalations" />
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Comments</p>
                  <div className="mt-3 space-y-2">
                    <textarea
                      name="body"
                      required
                      className="min-h-24 w-full rounded-xl border border-[rgba(16,26,56,0.12)] px-3 py-2 text-sm text-slate-900 outline-none"
                      placeholder="Add escalation progress, owner notes, or next-step context."
                    />
                    <button className="rounded-full bg-[rgba(56,189,248,0.12)] px-3 py-2 text-xs font-semibold text-sky-800">
                      Add comment
                    </button>
                  </div>
                  {escalation.comments.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {escalation.comments.slice(0, 3).map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-[rgba(9,18,43,0.04)] px-3 py-3 text-sm text-slate-700">
                          <p>{comment.body}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {comment.createdByUser?.name ?? "Unknown"} • {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </form>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
