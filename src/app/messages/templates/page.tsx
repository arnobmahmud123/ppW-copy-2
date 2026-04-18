import { requireAppSession } from "@/lib/app-session";
import { SurfaceCard } from "@/components/ui/surface-card";
import { archiveMessageTemplateAction, restoreMessageTemplateAction, saveMessageTemplateAction } from "@/app/messages/actions";
import { getMessagingAccessContext, getMessageTemplateManagerWorkspace } from "@/modules/messaging";
import { inferTemplateVariables, messageTemplateVariables, renderTemplateString } from "@/modules/messaging/template-utils";

type MessageTemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const categoryOptions = [
  ["REVISION_REQUEST", "Revision Request"],
  ["CLIENT_UPDATE", "Client Update"],
  ["ASSIGNMENT_NOTE", "Assignment Note"],
  ["QC_FEEDBACK", "QC Feedback"],
  ["ACCOUNTING_NOTE", "Accounting Note"],
  ["GENERAL", "General"]
] as const;

const visibilityOptions = [
  ["INTERNAL_ONLY", "Internal only"],
  ["CONTRACTOR_VISIBLE", "Contractor visible"],
  ["CLIENT_VISIBLE", "Client visible"],
  ["TASK_PARTICIPANTS_ONLY", "Task participants only"]
] as const;

const messageTypeOptions = [
  ["COMMENT", "Comment"],
  ["REVISION_REQUEST", "Revision Request"],
  ["CLIENT_UPDATE", "Client Update"],
  ["ASSIGNMENT_NOTE", "Assignment Note"],
  ["QC_FEEDBACK", "QC Feedback"],
  ["ACCOUNTING_NOTE", "Accounting Note"]
] as const;

const previewContext = {
  work_order_number: "WO-2026-0142",
  address: "1450 Peachtree St NE, Atlanta, GA 30309",
  contractor_name: "Summit Field Services",
  client_name: "First National Servicing",
  due_date: "03/31/2026",
  service_type: "Winterization",
  reviewer_note: "Missing after photos for the rear utility room."
};

function TemplateEditor({
  template
}: {
  template?: {
    id: string;
    name: string;
    category: string;
    visibilityScope: string;
    messageType: string;
    subjectTemplate: string | null;
    bodyTemplate: string;
    variables: unknown;
    isActive: boolean;
  };
}) {
  const variables = Array.isArray(template?.variables) ? template?.variables.join(", ") : "";
  const subjectPreview = renderTemplateString(template?.subjectTemplate ?? "Revision needed for {{work_order_number}}", previewContext);
  const bodyPreview = renderTemplateString(template?.bodyTemplate ?? "Please review {{work_order_number}} at {{address}}.", previewContext);
  const derivedVariables = inferTemplateVariables(`${template?.subjectTemplate ?? ""} ${template?.bodyTemplate ?? ""}`);

  return (
    <form action={saveMessageTemplateAction} className="grid gap-4 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <input type="hidden" name="templateId" value={template?.id ?? ""} />
      <input type="hidden" name="isActive" value={template?.isActive === false ? "false" : "true"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Title</span>
          <input
            name="name"
            defaultValue={template?.name ?? ""}
            className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
            placeholder="QC correction request"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            name="category"
            defaultValue={template?.category ?? "REVISION_REQUEST"}
            className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
          >
            {categoryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Visibility scope</span>
          <select
            name="visibilityScope"
            defaultValue={template?.visibilityScope ?? "INTERNAL_ONLY"}
            className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
          >
            {visibilityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-slate-700">Message type</span>
          <select
            name="messageType"
            defaultValue={template?.messageType ?? "COMMENT"}
            className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
          >
            {messageTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">Subject template</span>
        <input
          name="subjectTemplate"
          defaultValue={template?.subjectTemplate ?? ""}
          className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
          placeholder="Update for {{work_order_number}}"
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">Body template</span>
        <textarea
          name="bodyTemplate"
          defaultValue={template?.bodyTemplate ?? ""}
          className="min-h-32 rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-3 text-sm text-slate-950 outline-none"
          placeholder="Use placeholders like {{address}} and {{reviewer_note}}."
        />
      </label>
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-slate-700">Variables</span>
        <input
          name="variables"
          defaultValue={variables}
          className="rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 py-2.5 text-sm text-slate-950 outline-none"
          placeholder="work_order_number,address,contractor_name,client_name,due_date,service_type,reviewer_note"
        />
      </label>
      <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview before insert</p>
        <p className="mt-3 text-sm font-semibold text-slate-900">{subjectPreview}</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{bodyPreview}</p>
        <p className="mt-3 text-xs text-slate-500">
          Detected placeholders: {derivedVariables.length > 0 ? derivedVariables.join(", ") : "none"}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Suggested placeholders: {messageTemplateVariables.map((entry) => entry.key).join(", ")}
        </p>
        <button className="app-primary-button">{template ? "Save changes" : "Create template"}</button>
      </div>
    </form>
  );
}

export default async function MessageTemplatesPage({ searchParams }: MessageTemplatesPageProps) {
  const session = await requireAppSession();
  const context = await getMessagingAccessContext(session.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const notice = typeof resolvedSearchParams.notice === "string" ? resolvedSearchParams.notice : undefined;

  if (!context) {
    return null;
  }

  const workspace = await getMessageTemplateManagerWorkspace(context);

  if (!workspace) {
    return null;
  }

  return (
    <main className="flex flex-col gap-6">
      {notice ? (
        <div className="rounded-2xl border border-[rgba(56,189,248,0.22)] bg-[rgba(56,189,248,0.1)] px-4 py-3 text-sm font-medium text-sky-900">
          {notice}
        </div>
      ) : null}

      <SurfaceCard className="app-hero">
        <p className="app-hero-label">Template Manager</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-semibold text-white">
          Manage revision, client, assignment, QC, and accounting message templates with previews and lifecycle control.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Templates support placeholder-driven office language, visibility-aware message types, and archive-friendly lifecycle management.
        </p>
      </SurfaceCard>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard className="app-panel px-5 py-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Create Template</p>
          {workspace.canManageTemplates ? (
            <div className="mt-4">
              <TemplateEditor />
            </div>
          ) : (
            <div className="mt-4 rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-600">
              You can review active templates here, but only permitted internal users can create or edit them.
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="app-panel px-5 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Active Templates</p>
              <p className="mt-1 text-sm text-slate-600">Templates available in compose pickers across work-order, internal, vendor, and client messaging flows.</p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{workspace.templates.length}</span>
          </div>
          <div className="mt-4 space-y-4">
            {workspace.templates.map((template) => (
              <div key={template.id} className="rounded-[1.25rem] border border-[rgba(99,207,255,0.14)] bg-white/75 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800">
                    {template.category.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {template.visibilityScope.replaceAll("_", " ")}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Active
                  </span>
                </div>
                <div className="mt-4">
                  {workspace.canManageTemplates ? (
                    <TemplateEditor
                      template={{
                        id: template.id,
                        name: template.name,
                        category: template.category,
                        visibilityScope: template.visibilityScope,
                        messageType: template.messageType,
                        subjectTemplate: template.subjectTemplate,
                        bodyTemplate: template.bodyTemplate,
                        variables: template.variables,
                        isActive: template.isActive
                      }}
                    />
                  ) : (
                    <>
                      <p className="font-semibold text-slate-950">{template.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{template.bodyTemplate}</p>
                    </>
                  )}
                </div>
                {workspace.canManageTemplates ? (
                  <form action={archiveMessageTemplateAction} className="mt-3">
                    <input type="hidden" name="templateId" value={template.id} />
                    <button className="rounded-full bg-[rgba(244,63,94,0.12)] px-3 py-1.5 text-xs font-semibold text-rose-800">
                      Archive
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="app-panel px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Archived Templates</p>
            <p className="mt-1 text-sm text-slate-600">Inactive templates stay out of compose pickers but remain recoverable.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{workspace.archivedTemplates.length}</span>
        </div>
        <div className="mt-4 space-y-3">
          {workspace.archivedTemplates.length > 0 ? (
            workspace.archivedTemplates.map((template) => (
              <div key={template.id} className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {template.category.replaceAll("_", " ")} • archived {template.archivedAt?.toLocaleDateString() ?? "recently"}
                    </p>
                  </div>
                  {workspace.canManageTemplates ? (
                    <form action={restoreMessageTemplateAction}>
                      <input type="hidden" name="templateId" value={template.id} />
                      <button className="rounded-full bg-[rgba(16,185,129,0.12)] px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        Restore
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.15rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-600">
              No archived templates yet.
            </div>
          )}
        </div>
      </SurfaceCard>
    </main>
  );
}
