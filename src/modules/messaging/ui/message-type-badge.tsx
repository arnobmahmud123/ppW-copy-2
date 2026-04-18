import { MessageType } from "@prisma/client";

type MessageTypeBadgeProps = {
  type: MessageType;
};

const typeStyles: Record<MessageType, string> = {
  COMMENT: "bg-white text-slate-700 ring-1 ring-[rgba(99,207,255,0.18)]",
  SYSTEM_EVENT: "bg-violet-100 text-violet-800",
  REVISION_REQUEST: "bg-rose-100 text-rose-800",
  CLIENT_UPDATE: "bg-emerald-100 text-emerald-800",
  ASSIGNMENT_NOTE: "bg-sky-100 text-sky-800",
  QC_FEEDBACK: "bg-amber-100 text-amber-800",
  BID_UPDATE: "bg-indigo-100 text-indigo-800",
  INSPECTION_UPDATE: "bg-cyan-100 text-cyan-800",
  ACCOUNTING_NOTE: "bg-orange-100 text-orange-800"
};

const typeLabels: Record<MessageType, string> = {
  COMMENT: "Comment",
  SYSTEM_EVENT: "System",
  REVISION_REQUEST: "Revision",
  CLIENT_UPDATE: "Client Update",
  ASSIGNMENT_NOTE: "Assignment",
  QC_FEEDBACK: "QC",
  BID_UPDATE: "Bid",
  INSPECTION_UPDATE: "Inspection",
  ACCOUNTING_NOTE: "Accounting"
};

export function MessageTypeBadge({ type }: MessageTypeBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${typeStyles[type]}`}>
      {typeLabels[type]}
    </span>
  );
}
