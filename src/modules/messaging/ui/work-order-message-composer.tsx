"use client";

import { useMemo, useState } from "react";
import { MessageType, MessageVisibilityScope } from "@prisma/client";
import { Paperclip, Pin, Reply } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createWorkOrderThreadMessageAction } from "@/app/work-orders/actions";
import { inferTemplateVariables, renderTemplateString, type MessageTemplateContext } from "@/modules/messaging/template-utils";

type TemplateOption = {
  id: string;
  name: string;
  category: string;
  visibilityScope: MessageVisibilityScope;
  messageType: MessageType;
  subjectTemplate: string | null;
  bodyTemplate: string;
  variables?: unknown;
};

type MediaOption = {
  id: string;
  fileName: string;
  stage: string;
  workOrderServiceTitle: string | null;
};

type WorkOrderMessageComposerProps = {
  workOrderId: string;
  availableScopes: MessageVisibilityScope[];
  templates: TemplateOption[];
  mediaOptions: MediaOption[];
  action?: (formData: FormData) => void | Promise<void>;
  defaultThreadId?: string;
  redirectBasePath?: string;
  templateContext?: MessageTemplateContext;
  replyTo?:
    | {
        id: string;
        threadId: string;
        subject: string | null;
        authorName: string;
        body: string;
      }
    | undefined;
};

const visibilityLabels: Record<MessageVisibilityScope, string> = {
  INTERNAL_ONLY: "Internal only",
  CONTRACTOR_VISIBLE: "Contractor visible",
  CLIENT_VISIBLE: "Client visible",
  SYSTEM_ONLY: "System only",
  TASK_PARTICIPANTS_ONLY: "Task participants only"
};

export function WorkOrderMessageComposer({
  workOrderId,
  availableScopes,
  templates,
  mediaOptions,
  action = createWorkOrderThreadMessageAction,
  defaultThreadId,
  redirectBasePath,
  templateContext,
  replyTo
}: WorkOrderMessageComposerProps) {
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState(replyTo?.subject ?? "");
  const [body, setBody] = useState("");
  const [visibilityScope, setVisibilityScope] = useState<MessageVisibilityScope>(availableScopes[0] ?? "INTERNAL_ONLY");
  const [messageType, setMessageType] = useState<MessageType>(MessageType.COMMENT);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? null,
    [templateId, templates]
  );
  const templatePreview = useMemo(() => {
    if (!selectedTemplate) {
      return null;
    }

    return {
      subject: renderTemplateString(selectedTemplate.subjectTemplate, templateContext ?? {}),
      body: renderTemplateString(selectedTemplate.bodyTemplate, templateContext ?? {}),
      variables: inferTemplateVariables(`${selectedTemplate.subjectTemplate ?? ""} ${selectedTemplate.bodyTemplate}`)
    };
  }, [selectedTemplate, templateContext]);

  function handleTemplateChange(nextTemplateId: string) {
    setTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);

    if (!template) {
      return;
    }

    setSubject(template.subjectTemplate ?? replyTo?.subject ?? "");
    setBody(template.bodyTemplate);
    setVisibilityScope(template.visibilityScope);
    setMessageType(template.messageType);
  }

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="threadId" value={replyTo?.threadId ?? defaultThreadId ?? ""} />
      <input type="hidden" name="replyToMessageId" value={replyTo?.id ?? ""} />
      <input type="hidden" name="redirectBasePath" value={redirectBasePath ?? ""} />

      {replyTo ? (
        <div className="rounded-2xl border border-[rgba(99,207,255,0.18)] bg-[rgba(56,189,248,0.08)] px-4 py-3 text-sm text-slate-700">
          <div className="flex items-center gap-2 text-sky-800">
            <Reply className="h-4 w-4" />
            <span className="font-semibold">Replying to {replyTo.authorName}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{replyTo.body.slice(0, 180)}</p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="templateId">
                Template
              </label>
              <select
                id="templateId"
                name="templateId"
                value={templateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className="mt-2 flex h-10 w-full rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="visibilityScope">
                Visibility
              </label>
              <select
                id="visibilityScope"
                name="visibilityScope"
                value={visibilityScope}
                onChange={(event) => setVisibilityScope(event.target.value as MessageVisibilityScope)}
                className="mt-2 flex h-10 w-full rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                {availableScopes.map((scope) => (
                  <option key={scope} value={scope}>
                    {visibilityLabels[scope]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="subject">
                Subject
              </label>
              <Input
                id="subject"
                name="subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-2"
                placeholder="Add a subject if useful"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="messageType">
                Type
              </label>
              <select
                id="messageType"
                name="messageType"
                value={messageType}
                onChange={(event) => setMessageType(event.target.value as MessageType)}
                className="mt-2 flex h-10 w-full rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white/95 px-4 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                {Object.values(MessageType).map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="body">
              Message
            </label>
            <textarea
              id="body"
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-2 min-h-36 w-full rounded-2xl border border-[rgba(16,26,56,0.12)] bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="Write the operational message, client update, or revision request here."
            />
          </div>

          {selectedTemplate && templatePreview ? (
            <div className="rounded-2xl border border-[rgba(16,26,56,0.1)] bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview Before Insert</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">{templatePreview.subject || "No subject"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{templatePreview.body}</p>
              <p className="mt-3 text-xs text-slate-500">
                Placeholders: {templatePreview.variables.length > 0 ? templatePreview.variables.join(", ") : "none"}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[rgba(99,207,255,0.16)] bg-white/75 px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Paperclip className="h-4 w-4 text-cyan-500" />
            Attachment area
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Link existing work-order photos or files now. Direct uploads land in Part 4.
          </p>
          <div className="mt-4 space-y-2.5">
            <label className="block rounded-2xl border border-dashed border-[rgba(99,207,255,0.18)] bg-[rgba(248,252,255,0.95)] px-3 py-3 text-sm text-slate-700">
              <span className="block font-medium text-slate-950">Direct upload</span>
              <span className="mt-1 block text-xs text-slate-500">Attach images, PDFs, or field notes directly to this message.</span>
              <input
                type="file"
                name="directFiles"
                multiple
                className="mt-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[rgba(56,189,248,0.14)] file:px-3 file:py-1.5 file:font-semibold file:text-sky-800"
              />
            </label>
            {mediaOptions.length > 0 ? (
              mediaOptions.slice(0, 6).map((asset) => (
                <label key={asset.id} className="flex items-start gap-3 rounded-2xl border border-[rgba(99,207,255,0.12)] bg-[rgba(248,252,255,0.95)] px-3 py-3 text-sm text-slate-700">
                  <input type="checkbox" name="mediaAssetIds" value={asset.id} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">{asset.fileName}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {asset.stage}
                      {asset.workOrderServiceTitle ? ` • ${asset.workOrderServiceTitle}` : ""}
                    </span>
                  </span>
                </label>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[rgba(99,207,255,0.18)] px-3 py-4 text-sm text-slate-500">
                No existing files are linked to this order yet.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-[rgba(9,18,43,0.04)] px-3 py-3 text-xs leading-5 text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Pin className="h-3.5 w-3.5" />
              Timeline reminder
            </div>
            <p className="mt-1">Pinned messages and system events will stay visible at the top of the thread feed.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Messages are permission-filtered server-side and only visible to the audiences allowed by your role.
        </p>
        <button type="submit" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
          Post message
        </button>
      </div>
    </form>
  );
}
