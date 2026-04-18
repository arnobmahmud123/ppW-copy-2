import { requireAppSession } from "@/lib/app-session";
import { SurfaceCard } from "@/components/ui/surface-card";
import { getMessagingAccessContext, getMessagingEscalationWorkspaceWithFilters } from "@/modules/messaging";
import { EscalationBoard } from "@/modules/messaging/ui/escalation-board";

type MessageEscalationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MessageEscalationsPage({ searchParams }: MessageEscalationsPageProps) {
  const session = await requireAppSession();
  const context = await getMessagingAccessContext(session.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const notice = typeof resolvedSearchParams.notice === "string" ? resolvedSearchParams.notice : undefined;
  const ownerId = typeof resolvedSearchParams.ownerId === "string" ? resolvedSearchParams.ownerId : "";
  const urgency = typeof resolvedSearchParams.urgency === "string" ? resolvedSearchParams.urgency : "";
  const threadType = typeof resolvedSearchParams.threadType === "string" ? resolvedSearchParams.threadType : "";
  const overdueOnly =
    typeof resolvedSearchParams.overdue === "string"
      ? resolvedSearchParams.overdue === "true"
      : Array.isArray(resolvedSearchParams.overdue)
        ? resolvedSearchParams.overdue.includes("true")
        : false;

  if (!context) {
    return null;
  }

  const workspace = await getMessagingEscalationWorkspaceWithFilters(context, {
    ownerId: ownerId || undefined,
    urgency: urgency || undefined,
    threadType: threadType || undefined,
    overdueOnly
  });

  return (
    <main className="flex flex-col gap-6">
      {notice ? (
        <div className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.1)] px-4 py-3 text-sm font-medium text-sky-900">
          {notice}
        </div>
      ) : null}

      <SurfaceCard className="app-hero">
        <p className="app-hero-label">Escalation Desk</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold text-white">
          Manage message escalations, ownership, SLA deadlines, and resolution flow.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          This queue helps teams assign message ownership, set response SLAs, add comments, and close escalations without losing thread context.
        </p>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Open", workspace.totals.open],
          ["Overdue", workspace.totals.overdue],
          ["Unowned", workspace.totals.unowned]
        ].map(([label, value]) => (
          <SurfaceCard key={label} className="app-panel px-5 py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-slate-950">{value}</p>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="app-panel px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Escalation Filters</p>
            <p className="mt-1 text-sm text-slate-600">
              Narrow the queue by owner, urgency, overdue posture, and thread type.
            </p>
          </div>
          <a href="/messages/escalations" className="app-secondary-button">
            Clear filters
          </a>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Owner</span>
            <select
              name="ownerId"
              defaultValue={workspace.filters.ownerId}
              className="rounded-xl border border-[rgba(16,26,56,0.12)] bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none"
            >
              <option value="">All owners</option>
              {workspace.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Urgency</span>
            <select
              name="urgency"
              defaultValue={workspace.filters.urgency}
              className="rounded-xl border border-[rgba(16,26,56,0.12)] bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none"
            >
              <option value="">All urgency</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Thread type</span>
            <select
              name="threadType"
              defaultValue={workspace.filters.threadType}
              className="rounded-xl border border-[rgba(16,26,56,0.12)] bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none"
            >
              <option value="">All threads</option>
              <option value="WORK_ORDER">Work Order</option>
              <option value="TASK">Task</option>
              <option value="BID">Bid</option>
              <option value="INSPECTION">Inspection</option>
              <option value="GENERAL">General</option>
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-[rgba(16,26,56,0.12)] bg-white/70 px-3 py-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              name="overdue"
              value="true"
              defaultChecked={workspace.filters.overdueOnly}
              className="size-4 rounded border-[rgba(16,26,56,0.18)]"
            />
            Overdue only
          </label>

          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-2">
            <button className="app-primary-button">Apply filters</button>
            <a href="/messages/escalations" className="app-secondary-button">
              Reset
            </a>
          </div>
        </form>
      </SurfaceCard>

      <EscalationBoard escalations={workspace.escalations} owners={workspace.owners} currentUserName={session.name} />
    </main>
  );
}
