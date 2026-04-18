import { MessageVisibilityScope } from "@prisma/client";

type MessageVisibilityBadgeProps = {
  scope: MessageVisibilityScope;
};

const scopeStyles: Record<MessageVisibilityScope, string> = {
  INTERNAL_ONLY: "bg-slate-100 text-slate-700",
  CONTRACTOR_VISIBLE: "bg-sky-100 text-sky-800",
  CLIENT_VISIBLE: "bg-emerald-100 text-emerald-800",
  SYSTEM_ONLY: "bg-violet-100 text-violet-800",
  TASK_PARTICIPANTS_ONLY: "bg-amber-100 text-amber-800"
};

const scopeLabels: Record<MessageVisibilityScope, string> = {
  INTERNAL_ONLY: "Internal",
  CONTRACTOR_VISIBLE: "Contractor",
  CLIENT_VISIBLE: "Client",
  SYSTEM_ONLY: "System",
  TASK_PARTICIPANTS_ONLY: "Task Participants"
};

export function MessageVisibilityBadge({ scope }: MessageVisibilityBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${scopeStyles[scope]}`}>
      {scopeLabels[scope]}
    </span>
  );
}
