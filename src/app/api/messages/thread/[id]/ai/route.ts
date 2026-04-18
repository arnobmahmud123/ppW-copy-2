import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging/permissions";
import {
  answerThreadAssistantQuestion,
  buildThreadAiInsights,
  extractWorkOrderReference,
  runNaturalLanguageThreadSearch,
} from "@/modules/messaging/ai-tools";

const DOCUMENTS_AI_ROOT =
  process.env.MESSAGE_AI_KNOWLEDGE_DIR || "/Users/mdshumonmiah/Documents";
const MAX_DOCUMENT_FILES = 80;
const MAX_DOCUMENT_BYTES = 12000;
const TEXT_DOCUMENT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".log",
]);
const SPREADSHEET_EXTENSIONS = new Set([".xlsx"]);
const execFileAsync = promisify(execFile);

const KNOWLEDGE_IGNORED_PATH_SEGMENTS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const KNOWLEDGE_IGNORED_FILE_PATTERNS = [
  /^package-lock\.json$/i,
  /^pnpm-lock\.ya?ml$/i,
  /^yarn\.lock$/i,
  /^tsconfig.*\.json$/i,
  /^next\.config\./i,
  /^seed[-_.].*/i,
];

type ExternalKnowledgeDocument = {
  id: string;
  fileName: string;
  filePath: string;
  excerpt: string;
};

type ExternalMeeting = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  location: string | null;
  meetingUrl: string | null;
};

type ExternalWorkOrderTask = {
  id: string;
  taskType: string;
  taskName: string;
  qty: number;
  uom: string;
  contractorPrice: number;
  clientPrice: number;
  total: number;
  comments: string;
};

type ExternalWorkOrderTimelineMessage = {
  id: string;
  body: string;
  createdAt: Date;
  messageType: string;
  authorName: string | null;
};

type ExternalFocusedWorkOrder = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  status: string;
  serviceType: string;
  dueDate: Date | null;
  assignedDate: Date | null;
  startDate: Date | null;
  estCompletion: Date | null;
  fieldComplete: Date | null;
  updatedAt: Date;
  clientName: string | null;
  assignedContractorName: string | null;
  assignedCoordinatorName: string | null;
  assignedProcessorName: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
  invoiceTotal: number | null;
  invoiceDate: Date | null;
  invoiceSentToClientDate: Date | null;
  invoiceCompleteDate: Date | null;
  invoiceNotes: string | null;
  bidItems: ExternalWorkOrderTask[];
  completionItems: ExternalWorkOrderTask[];
  photoCounts: Record<string, number>;
  messageTimeline: ExternalWorkOrderTimelineMessage[];
  threadId: string | null;
};

function shouldSkipKnowledgePath(fullPath: string) {
  const normalized = fullPath.split(path.sep).map((segment) => segment.trim()).filter(Boolean);
  if (normalized.some((segment) => KNOWLEDGE_IGNORED_PATH_SEGMENTS.has(segment))) {
    return true;
  }

  const fileName = path.basename(fullPath);
  return KNOWLEDGE_IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function decodeXmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractXlsxText(filePath: string) {
  try {
    const sharedStringsXml = await execFileAsync("unzip", ["-p", filePath, "xl/sharedStrings.xml"], {
      maxBuffer: 2 * 1024 * 1024,
    }).then((result) => result.stdout).catch(() => "");

    const sharedStrings = Array.from(sharedStringsXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map((match) =>
      decodeXmlText(match[1] ?? ""),
    );

    const workbookXml = await execFileAsync("unzip", ["-p", filePath, "xl/workbook.xml"], {
      maxBuffer: 2 * 1024 * 1024,
    }).then((result) => result.stdout).catch(() => "");

    const sheetNames = Array.from(workbookXml.matchAll(/<sheet\b[^>]*name="([^"]+)"/g)).map(
      (match) => match[1] ?? "",
    );

    const zipListing = await execFileAsync("unzip", ["-Z1", filePath], {
      maxBuffer: 2 * 1024 * 1024,
    }).then((result) => result.stdout).catch(() => "");

    const worksheetEntries = zipListing
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry))
      .sort();

    const sheetChunks: string[] = [];

    for (let index = 0; index < worksheetEntries.length; index += 1) {
      const worksheetXml = await execFileAsync("unzip", ["-p", filePath, worksheetEntries[index]], {
        maxBuffer: 2 * 1024 * 1024,
      }).then((result) => result.stdout).catch(() => "");

      const rows = Array.from(worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g))
        .slice(0, 40)
        .map((rowMatch) => {
          const rowXml = rowMatch[1] ?? "";
          const values = Array.from(rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g))
            .map((cellMatch) => {
              const cellAttributes = cellMatch[1] ?? "";
              const cellXml = cellMatch[2] ?? "";
              const sharedStringIndex = cellAttributes.match(/\bt="s"/) ? cellXml.match(/<v>(\d+)<\/v>/)?.[1] : null;

              if (sharedStringIndex) {
                return sharedStrings[Number(sharedStringIndex)] ?? "";
              }

              const inlineString = cellXml.match(/<is>([\s\S]*?)<\/is>/)?.[1];
              if (inlineString) {
                return decodeXmlText(inlineString);
              }

              const value = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
              return decodeXmlText(value);
            })
            .filter(Boolean);

          return values.join(" | ");
        })
        .filter(Boolean);

      if (rows.length === 0) {
        continue;
      }

      const sheetName = sheetNames[index] || `Sheet ${index + 1}`;
      sheetChunks.push(`${sheetName}: ${rows.join(" ; ")}`);
      if (sheetChunks.join(" ").length >= 5000) {
        break;
      }
    }

    return sheetChunks.join("\n").slice(0, 5000).trim();
  } catch {
    return "";
  }
}

async function collectKnowledgeDocuments(rootDir: string) {
  const documents: ExternalKnowledgeDocument[] = [];
  let bytesRead = 0;

  async function walk(currentDir: string) {
    if (documents.length >= MAX_DOCUMENT_FILES || bytesRead >= MAX_DOCUMENT_BYTES) {
      return;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (documents.length >= MAX_DOCUMENT_FILES || bytesRead >= MAX_DOCUMENT_BYTES) {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (shouldSkipKnowledgePath(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (SPREADSHEET_EXTENSIONS.has(extension)) {
        const excerpt = await extractXlsxText(fullPath);
        documents.push({
          id: fullPath,
          fileName: entry.name,
          filePath: fullPath,
          excerpt,
        });
        bytesRead += Math.min(excerpt.length, 2400);
        continue;
      }

      if (!TEXT_DOCUMENT_EXTENSIONS.has(extension)) {
        documents.push({
          id: fullPath,
          fileName: entry.name,
          filePath: fullPath,
          excerpt: "",
        });
        continue;
      }

      const buffer = await fs.readFile(fullPath).catch(() => null);
      if (!buffer) {
        continue;
      }

      const remainingBudget = Math.max(0, MAX_DOCUMENT_BYTES - bytesRead);
      if (remainingBudget === 0) {
        return;
      }

      const excerpt = buffer
        .subarray(0, Math.min(buffer.byteLength, Math.min(1200, remainingBudget)))
        .toString("utf8")
        .replace(/\s+/g, " ")
        .trim();

      bytesRead += Math.min(buffer.byteLength, Math.min(1200, remainingBudget));
      documents.push({
        id: fullPath,
        fileName: entry.name,
        filePath: fullPath,
        excerpt,
      });
    }
  }

  const rootStats = await fs.stat(rootDir).catch(() => null);
  if (!rootStats?.isDirectory()) {
    return [];
  }

  await walk(rootDir);
  return documents;
}

function parseStoredWorkOrderTasks(rawTasks: string | null | undefined) {
  if (!rawTasks) {
    return { bidItems: [] as ExternalWorkOrderTask[], completionItems: [] as ExternalWorkOrderTask[] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawTasks);
  } catch {
    return { bidItems: [] as ExternalWorkOrderTask[], completionItems: [] as ExternalWorkOrderTask[] };
  }

  if (!Array.isArray(parsed)) {
    return { bidItems: [] as ExternalWorkOrderTask[], completionItems: [] as ExternalWorkOrderTask[] };
  }

  const normalized = parsed
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const qty = Number(item.qty ?? 0);
      const clientPrice = Number(item.clientPrice ?? 0);
      return {
        id: String(item.id ?? item.taskName ?? `task-${Math.random().toString(36).slice(2, 10)}`),
        taskType: String(item.taskType ?? ""),
        taskName: String(item.taskName ?? ""),
        qty,
        uom: String(item.uom ?? ""),
        contractorPrice: Number(item.contractorPrice ?? 0),
        clientPrice,
        total: qty * clientPrice,
        comments: String(item.comments ?? ""),
      } satisfies ExternalWorkOrderTask;
    })
    .filter((item) => item.taskName.trim().length > 0);

  return {
    bidItems: normalized.filter((item) => item.taskType.toLowerCase() === "bid"),
    completionItems: normalized.filter((item) => item.taskType.toLowerCase() === "completion"),
  };
}

async function loadFocusedWorkOrderContext(options: { workOrderId?: string | null; workOrderNumber?: string | null }) {
  const workOrder = options.workOrderId
    ? await db.workOrder.findUnique({
        where: { id: options.workOrderId },
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          description: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
          status: true,
          serviceType: true,
          dueDate: true,
          assignedDate: true,
          startDate: true,
          estCompletion: true,
          fieldComplete: true,
          updatedAt: true,
          tasks: true,
          client: { select: { name: true } },
          assignedContractor: { select: { name: true } },
          assignedCoordinator: { select: { name: true } },
          assignedProcessor: { select: { name: true } },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              clientTotal: true,
              invoiceDate: true,
              sentToClientDate: true,
              completeDate: true,
              notes: true,
            },
          },
        },
      })
    : options.workOrderNumber
      ? await db.workOrder.findFirst({
          where: { workOrderNumber: options.workOrderNumber },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            workOrderNumber: true,
            title: true,
            description: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            status: true,
            serviceType: true,
            dueDate: true,
            assignedDate: true,
            startDate: true,
            estCompletion: true,
            fieldComplete: true,
            updatedAt: true,
            tasks: true,
            client: { select: { name: true } },
            assignedContractor: { select: { name: true } },
            assignedCoordinator: { select: { name: true } },
            assignedProcessor: { select: { name: true } },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                clientTotal: true,
                invoiceDate: true,
                sentToClientDate: true,
                completeDate: true,
                notes: true,
              },
            },
          },
        })
      : null;

  if (!workOrder) {
    return null;
  }

  const [{ bidItems, completionItems }, attachments, thread, threadMessages, legacyMessages] = await Promise.all([
    Promise.resolve(parseStoredWorkOrderTasks(workOrder.tasks)),
    db.fileAttachment.findMany({
      where: { workOrderId: workOrder.id },
      select: { category: true },
    }),
    db.messageThread.findFirst({
      where: { workOrderId: workOrder.id },
      select: { id: true },
    }),
    db.workOrderMessage.findMany({
      where: { workOrderId: workOrder.id },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        id: true,
        body: true,
        createdAt: true,
        messageType: true,
        createdByUser: { select: { name: true } },
      },
    }),
    db.message.findMany({
      where: { workOrderId: workOrder.id },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    }),
  ]);

  const photoCounts = attachments.reduce<Record<string, number>>((acc, attachment) => {
    acc[attachment.category] = (acc[attachment.category] ?? 0) + 1;
    return acc;
  }, {});

  const messageTimeline: ExternalWorkOrderTimelineMessage[] = [
    ...threadMessages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      messageType: message.messageType,
      authorName: message.createdByUser?.name ?? null,
    })),
    ...legacyMessages.map((message) => ({
      id: message.id,
      body: message.content,
      createdAt: message.createdAt,
      messageType: "LEGACY_COMMENT",
      authorName: message.author?.name ?? null,
    })),
  ]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(-20);

  return {
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber ?? null,
    title: workOrder.title,
    description: workOrder.description,
    addressLine1: workOrder.addressLine1,
    city: workOrder.city,
    state: workOrder.state,
    postalCode: workOrder.postalCode,
    status: workOrder.status,
    serviceType: workOrder.serviceType,
    dueDate: workOrder.dueDate,
    assignedDate: workOrder.assignedDate,
    startDate: workOrder.startDate,
    estCompletion: workOrder.estCompletion,
    fieldComplete: workOrder.fieldComplete,
    updatedAt: workOrder.updatedAt,
    clientName: workOrder.client?.name ?? null,
    assignedContractorName: workOrder.assignedContractor?.name ?? null,
    assignedCoordinatorName: workOrder.assignedCoordinator?.name ?? null,
    assignedProcessorName: workOrder.assignedProcessor?.name ?? null,
    invoiceStatus: workOrder.invoice?.status ?? null,
    invoiceNumber: workOrder.invoice?.invoiceNumber ?? null,
    invoiceTotal: workOrder.invoice?.clientTotal ?? null,
    invoiceDate: workOrder.invoice?.invoiceDate ?? null,
    invoiceSentToClientDate: workOrder.invoice?.sentToClientDate ?? null,
    invoiceCompleteDate: workOrder.invoice?.completeDate ?? null,
    invoiceNotes: workOrder.invoice?.notes ?? null,
    bidItems,
    completionItems,
    photoCounts,
    messageTimeline,
    threadId: thread?.id ?? null,
  } satisfies ExternalFocusedWorkOrder;
}

async function loadGlobalOperationsContext() {
  const [totalWorkOrders, openWorkOrders, overdueWorkOrders, totalInvoices, overdueInvoices, workOrders] =
    await Promise.all([
      db.workOrder.count(),
      db.workOrder.count({
        where: {
          status: {
            in: ["NEW", "UNASSIGNED", "IN_PROGRESS", "ASSIGNED", "READ", "FIELD_COMPLETE", "OFFICE_APPROVED", "SENT_TO_CLIENT"],
          },
        },
      }),
      db.workOrder.count({
        where: {
          dueDate: { lt: new Date() },
          status: {
            notIn: ["COMPLETED", "CLOSED", "CANCELLED"],
          },
        },
      }),
      db.invoice.count(),
      db.invoice.count({
        where: { status: "OVERDUE" },
      }),
      db.workOrder.findMany({
        orderBy: [{ updatedAt: "desc" }],
        take: 120,
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
          status: true,
          dueDate: true,
          client: {
            select: { name: true },
          },
          assignedContractor: {
            select: { name: true },
          },
          assignedCoordinator: {
            select: { name: true },
          },
          assignedProcessor: {
            select: { name: true },
          },
          invoice: {
            select: {
              status: true,
              invoiceNumber: true,
            },
          },
        },
      }),
    ]);

  return {
    totalWorkOrders,
    openWorkOrders,
    overdueWorkOrders,
    totalInvoices,
    overdueInvoices,
    workOrders: workOrders.map((workOrder) => ({
      id: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber ?? null,
      title: workOrder.title,
      addressLine1: workOrder.addressLine1,
      city: workOrder.city,
      state: workOrder.state,
      postalCode: workOrder.postalCode,
      status: workOrder.status,
      dueDate: workOrder.dueDate,
      clientName: workOrder.client?.name ?? null,
      assignedContractorName: workOrder.assignedContractor?.name ?? null,
      assignedCoordinatorName: workOrder.assignedCoordinator?.name ?? null,
      assignedProcessorName: workOrder.assignedProcessor?.name ?? null,
      invoiceStatus: workOrder.invoice?.status ?? null,
      invoiceNumber: workOrder.invoice?.invoiceNumber ?? null,
    })),
  };
}

async function askGeminiAssistant(query: string, context: Awaited<ReturnType<typeof loadThreadAiContext>>) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey || !context) {
    return null;
  }

  const model =
    process.env.GEMINI_CHAT_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-flash-latest";
  const transcript = context.messages
    .slice(-20)
    .map((message) => `${message.createdByUser?.name ?? "Unknown"}: ${message.body}`)
    .join("\n");
  const taskSummary = context.tasks
    .slice(0, 10)
    .map((task) => `${task.title} [${task.status}]${task.assignedToUser?.name ? ` - ${task.assignedToUser.name}` : ""}`)
    .join("\n");
  const attachmentSummary = context.attachments.slice(0, 10).map((file) => file.fileName).join("\n");
  const meetingSummary = context.meetings
    .slice(0, 8)
    .map((meeting) =>
      `${meeting.title} | ${meeting.status} | starts ${new Date(meeting.startsAt).toISOString()}${
        meeting.location ? ` | ${meeting.location}` : ""
      }`,
    )
    .join("\n");
  const documentSummary = (context.knowledgeDocuments ?? [])
    .slice(0, 12)
    .map((document) =>
      `${document.excerpt ? document.excerpt : `Reference material from ${document.filePath}`}`,
    )
    .join("\n");
  const focusedWorkOrderSummary = context.focusedWorkOrder
    ? [
        `Focused work order number: ${context.focusedWorkOrder.workOrderNumber ?? context.focusedWorkOrder.id}`,
        `Focused title: ${context.focusedWorkOrder.title}`,
        `Focused status: ${context.focusedWorkOrder.status}`,
        `Focused service type: ${context.focusedWorkOrder.serviceType}`,
        `Focused address: ${context.focusedWorkOrder.addressLine1}, ${context.focusedWorkOrder.city}, ${context.focusedWorkOrder.state} ${context.focusedWorkOrder.postalCode}`,
        `Focused client: ${context.focusedWorkOrder.clientName ?? "Unknown"}`,
        `Focused contractor: ${context.focusedWorkOrder.assignedContractorName ?? "Unassigned"}`,
        `Focused coordinator: ${context.focusedWorkOrder.assignedCoordinatorName ?? "Unassigned"}`,
        `Focused processor: ${context.focusedWorkOrder.assignedProcessorName ?? "Unassigned"}`,
        `Focused due date: ${context.focusedWorkOrder.dueDate ? new Date(context.focusedWorkOrder.dueDate).toISOString() : "Not set"}`,
        `Focused assigned date: ${context.focusedWorkOrder.assignedDate ? new Date(context.focusedWorkOrder.assignedDate).toISOString() : "Not set"}`,
        `Focused start date: ${context.focusedWorkOrder.startDate ? new Date(context.focusedWorkOrder.startDate).toISOString() : "Not set"}`,
        `Focused estimated completion: ${context.focusedWorkOrder.estCompletion ? new Date(context.focusedWorkOrder.estCompletion).toISOString() : "Not set"}`,
        `Focused field complete: ${context.focusedWorkOrder.fieldComplete ? new Date(context.focusedWorkOrder.fieldComplete).toISOString() : "Not set"}`,
        `Focused invoice status: ${context.focusedWorkOrder.invoiceStatus ?? "No invoice"}`,
        `Focused invoice number: ${context.focusedWorkOrder.invoiceNumber ?? "N/A"}`,
        `Focused invoice total: ${typeof context.focusedWorkOrder.invoiceTotal === "number" ? context.focusedWorkOrder.invoiceTotal.toFixed(2) : "N/A"}`,
        `Bid count: ${context.focusedWorkOrder.bidItems.length}`,
        `Completion count: ${context.focusedWorkOrder.completionItems.length}`,
        `Largest bid items: ${
          context.focusedWorkOrder.bidItems
            .slice()
            .sort((a, b) => b.total - a.total)
            .slice(0, 6)
            .map((item) => `${item.taskName} (${item.total.toFixed(2)})`)
            .join("; ") || "None"
        }`,
        `Completion items: ${
          context.focusedWorkOrder.completionItems
            .map((item) => `${item.taskName} (${item.total.toFixed(2)})`)
            .join("; ") || "None"
        }`,
        `Photo counts: ${Object.entries(context.focusedWorkOrder.photoCounts)
          .map(([category, count]) => `${category}=${count}`)
          .join(", ") || "None"}`,
        `Focused message timeline: ${
          context.focusedWorkOrder.messageTimeline
            .slice(-8)
            .map((message) => `${message.authorName ?? "Unknown"} [${message.messageType}]: ${message.body}`)
            .join(" | ") || "No messages"
        }`,
      ].join("\n")
    : "No focused work order details.";

  const prompt = [
    `You are Gemini Assistant inside a team chat thread called "${context.threadName}".`,
    "Answer like a helpful human operations teammate.",
    "Be direct, warm, and practical.",
    "You have access to verified thread messages, verified related work order app data, verified meeting records, and connected reference material.",
    "Use only facts explicitly present in the provided context.",
    "Do not guess, infer, or embellish schedules, people updates, deliverable changes, counts, or statuses that are not explicitly listed.",
    "Do not pull in generic examples, demo seed text, or unrelated code/repository content as if they were live operational facts.",
    "Write like a strong operations teammate: summarize clearly, sound human, and synthesize the facts into a useful answer instead of dumping raw fields.",
    "Lead with the operational takeaway first, then support it with the most important verified details.",
    "Good summarization is encouraged, but every factual claim must still be grounded in the provided data.",
    "Do not mention raw file names, file paths, tab names, sheet names, or internal retrieval details unless the user explicitly asks for them.",
    "If the data does not explicitly support a requested detail, say that you do not see verified data for that detail and then answer with the verified facts you do have.",
    "Only use the connected Documents folder reference context when it directly supports the answer.",
    "If you mention a meeting, inspection, schedule, or appointment, it must come from the verified meetings section below or an explicit thread message.",
    "If the user asks about a specific work order number, prioritize the focused work order details below over generic thread context.",
    "For a specific work order question, answer with concrete operational facts such as current status, property, scope focus, bid count, top bid items, completion items, timeline, invoice, and recent thread notes when those facts are available.",
    "Do not say you cannot find the work order if it is present in the focused work order details below.",
    "",
    "Global operations snapshot:",
    context.globalContext
      ? [
          `Total work orders: ${context.globalContext.totalWorkOrders}`,
          `Open work orders: ${context.globalContext.openWorkOrders}`,
          `Overdue work orders: ${context.globalContext.overdueWorkOrders}`,
          `Total invoices: ${context.globalContext.totalInvoices}`,
          `Overdue invoices: ${context.globalContext.overdueInvoices}`,
        ].join("\n")
      : "No global operations data.",
    "",
    "Related work order data:",
    context.workOrder
      ? [
          `Work order number: ${context.workOrder.workOrderNumber ?? context.workOrder.id}`,
          `Title: ${context.workOrder.title}`,
          `Address: ${context.workOrder.addressLine1}, ${context.workOrder.city}, ${context.workOrder.state} ${context.workOrder.postalCode}`,
          `Status: ${context.workOrder.status}`,
          `Service type: ${context.workOrder.serviceType}`,
          `Due date: ${context.workOrder.dueDate ? new Date(context.workOrder.dueDate).toISOString() : "Not set"}`,
          `Client: ${context.workOrder.clientName ?? "Unknown"}`,
          `Assigned contractor: ${context.workOrder.assignedContractorName ?? "Unassigned"}`,
          `Assigned coordinator: ${context.workOrder.assignedCoordinatorName ?? "Unassigned"}`,
          `Assigned processor: ${context.workOrder.assignedProcessorName ?? "Unassigned"}`,
          `Invoice status: ${context.workOrder.invoiceStatus ?? "No invoice"}`,
          `Invoice number: ${context.workOrder.invoiceNumber ?? "N/A"}`,
          `Invoice total: ${typeof context.workOrder.invoiceTotal === "number" ? context.workOrder.invoiceTotal.toFixed(2) : "N/A"}`,
        ].join("\n")
      : "No related work order data.",
    "",
    "Focused work order details:",
    focusedWorkOrderSummary,
    "",
    "Recent messages:",
    transcript || "No recent messages.",
    "",
    "Open tasks:",
    taskSummary || "No tasks.",
    "",
    "Verified meetings:",
    meetingSummary || "No meetings are recorded for this thread.",
    "",
    "Recent files:",
    attachmentSummary || "No files.",
    "",
    "Connected Documents folder knowledge:",
    documentSummary || "No Documents-folder references were loaded.",
    "",
    `User question: ${query}`,
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error("Gemini assistant request failed", response.status, await response.text().catch(() => ""));
    return null;
  }

  const payload = await response.json().catch(() => null) as
    | {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      }
    | null;

  const answer = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!answer) {
    return null;
  }

  return {
    answer,
    citations: [],
  };
}

async function loadThreadAiContext(threadId: string) {
  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          createdByUser: {
            select: { id: true, name: true },
          },
          attachments: {
            select: { id: true, fileName: true, mimeType: true },
          },
        },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
      meetings: {
        orderBy: { startsAt: "desc" },
        take: 12,
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          location: true,
          meetingUrl: true,
        },
      },
      workOrder: {
        select: {
          id: true,
          workOrderNumber: true,
          title: true,
          addressLine1: true,
          city: true,
          state: true,
          postalCode: true,
          status: true,
          serviceType: true,
          dueDate: true,
          client: {
            select: { name: true },
          },
          assignedContractor: {
            select: { name: true },
          },
          assignedCoordinator: {
            select: { name: true },
          },
          assignedProcessor: {
            select: { name: true },
          },
          invoice: {
            select: {
              invoiceNumber: true,
              status: true,
              clientTotal: true,
            },
          },
        },
      },
    },
  });

  if (!thread) {
    return null;
  }

  const tasks = await db.messageSpaceTask.findMany({
    where: {
      messageThreadId: threadId,
      archivedAt: null,
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedToUser: {
        select: { name: true },
      },
    },
  });

  const attachments = await db.messageAttachment.findMany({
    where: {
      message: {
        messageThreadId: threadId,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      fileName: true,
      mimeType: true,
    },
  });

  const knowledgeDocuments = await collectKnowledgeDocuments(DOCUMENTS_AI_ROOT);
  const globalContext = await loadGlobalOperationsContext();
  const defaultFocusedWorkOrder = thread.workOrder
    ? await loadFocusedWorkOrderContext({ workOrderId: thread.workOrder.id })
    : null;

  return {
    threadName: thread.title ?? thread.workOrder?.workOrderNumber ?? "this thread",
    messages: thread.messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      createdByUser: message.createdByUser
        ? {
            id: message.createdByUser.id,
            name: message.createdByUser.name,
          }
        : null,
      attachments: message.attachments,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueAt: task.dueAt,
      assignedToUser: task.assignedToUser
        ? {
            name: task.assignedToUser.name,
          }
        : null,
    })),
    participants: thread.participants.map((participant) => ({
      id: participant.user.id,
      name: participant.user.name,
      roleName: participant.user.role,
    })),
    meetings: thread.meetings.map((meeting): ExternalMeeting => ({
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      status: meeting.status,
      location: meeting.location,
      meetingUrl: meeting.meetingUrl,
    })),
    attachments,
    knowledgeDocuments,
    globalContext,
    focusedWorkOrder: defaultFocusedWorkOrder,
    workOrder: thread.workOrder
      ? {
          id: thread.workOrder.id,
          workOrderNumber: thread.workOrder.workOrderNumber ?? null,
          title: thread.workOrder.title,
          addressLine1: thread.workOrder.addressLine1,
          city: thread.workOrder.city,
          state: thread.workOrder.state,
          postalCode: thread.workOrder.postalCode,
          status: thread.workOrder.status,
          serviceType: thread.workOrder.serviceType,
          dueDate: thread.workOrder.dueDate,
          clientName: thread.workOrder.client?.name ?? null,
          assignedContractorName: thread.workOrder.assignedContractor?.name ?? null,
          assignedCoordinatorName: thread.workOrder.assignedCoordinator?.name ?? null,
          assignedProcessorName: thread.workOrder.assignedProcessor?.name ?? null,
          invoiceStatus: thread.workOrder.invoice?.status ?? null,
          invoiceNumber: thread.workOrder.invoice?.invoiceNumber ?? null,
          invoiceTotal: thread.workOrder.invoice?.clientTotal ?? null,
        }
      : null,
  };
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getMessagingAccessContext(session.id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const canAccess = await canAccessMessageThread(access, id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiContext = await loadThreadAiContext(id);
  if (!aiContext) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json(buildThreadAiInsights(aiContext));
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getMessagingAccessContext(session.id);
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const canAccess = await canAccessMessageThread(access, id);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const aiContext = await loadThreadAiContext(id);
  if (!aiContext) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  const mode = payload.mode === "search" ? "search" : "assistant";

  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  if (mode === "search") {
    return NextResponse.json(runNaturalLanguageThreadSearch(aiContext, query));
  }

  const referencedWorkOrderNumber = extractWorkOrderReference(query);
  if (referencedWorkOrderNumber) {
    const focusedWorkOrder = await loadFocusedWorkOrderContext({ workOrderNumber: referencedWorkOrderNumber });
    if (focusedWorkOrder) {
      aiContext.focusedWorkOrder = focusedWorkOrder;
    }

    return NextResponse.json(answerThreadAssistantQuestion(aiContext, query));
  }

  const geminiAnswer = await askGeminiAssistant(query, aiContext);
  if (geminiAnswer) {
    return NextResponse.json(geminiAnswer);
  }

  return NextResponse.json(answerThreadAssistantQuestion(aiContext, query));
}
