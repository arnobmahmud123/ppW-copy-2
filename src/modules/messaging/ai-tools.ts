import { formatDistanceToNow } from "date-fns";

type AiMessage = {
  id: string;
  body: string;
  createdAt: Date | string;
  createdByUser: { id?: string; name: string | null } | null;
  attachments?: Array<{ id: string; fileName: string; mimeType?: string | null }>;
};

type AiTask = {
  id: string;
  title: string;
  status: string;
  dueAt: Date | string | null;
  assignedToUser?: { name: string | null } | null;
};

type AiParticipant = {
  id: string;
  name: string;
  roleName?: string | null;
};

type AiAttachment = {
  id: string;
  fileName: string;
  mimeType?: string | null;
};

type AiMeeting = {
  id: string;
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
  location?: string | null;
  meetingUrl?: string | null;
};

type AiKnowledgeDocument = {
  id: string;
  fileName: string;
  filePath: string;
  excerpt?: string | null;
};

type AiWorkOrderContext = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  status: string;
  serviceType: string;
  dueDate: Date | string | null;
  clientName: string | null;
  assignedContractorName: string | null;
  assignedCoordinatorName: string | null;
  assignedProcessorName: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
  invoiceTotal: number | null;
};

type AiGlobalWorkOrder = {
  id: string;
  workOrderNumber: string | null;
  title: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  status: string;
  dueDate: Date | string | null;
  clientName: string | null;
  assignedContractorName: string | null;
  assignedCoordinatorName: string | null;
  assignedProcessorName: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
};

type AiGlobalContext = {
  totalWorkOrders: number;
  openWorkOrders: number;
  overdueWorkOrders: number;
  totalInvoices: number;
  overdueInvoices: number;
  overdueByClient: Array<{
    clientName: string;
    overdueWorkOrders: number;
  }>;
  workOrders: AiGlobalWorkOrder[];
};

type AiFocusedWorkOrderTask = {
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

type AiFocusedWorkOrderMessage = {
  id: string;
  body: string;
  createdAt: Date | string;
  messageType: string;
  authorName: string | null;
};

type AiFocusedWorkOrder = {
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
  dueDate: Date | string | null;
  assignedDate: Date | string | null;
  startDate: Date | string | null;
  estCompletion: Date | string | null;
  fieldComplete: Date | string | null;
  updatedAt: Date | string;
  clientName: string | null;
  assignedContractorName: string | null;
  assignedCoordinatorName: string | null;
  assignedProcessorName: string | null;
  invoiceStatus: string | null;
  invoiceNumber: string | null;
  invoiceTotal: number | null;
  invoiceDate: Date | string | null;
  invoiceSentToClientDate: Date | string | null;
  invoiceCompleteDate: Date | string | null;
  invoiceNotes: string | null;
  bidItems: AiFocusedWorkOrderTask[];
  completionItems: AiFocusedWorkOrderTask[];
  photoCounts: Record<string, number>;
  messageTimeline: AiFocusedWorkOrderMessage[];
  threadId: string | null;
};

type ThreadAiContext = {
  threadName: string;
  messages: AiMessage[];
  tasks: AiTask[];
  participants: AiParticipant[];
  meetings: AiMeeting[];
  attachments: AiAttachment[];
  knowledgeDocuments?: AiKnowledgeDocument[];
  workOrder?: AiWorkOrderContext | null;
  focusedWorkOrder?: AiFocusedWorkOrder | null;
  globalContext?: AiGlobalContext | null;
};

type NaturalLanguageSearchResult = {
  messages: Array<{ id: string; body: string; score: number; author: string; createdAt: string | Date }>;
  files: Array<{ id: string; fileName: string; score: number }>;
  users: Array<{ id: string; name: string; roleName: string | null; score: number }>;
  documents: Array<{ id: string; fileName: string; filePath: string; excerpt: string; score: number }>;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9@#:/._-]+/i)
    .filter(Boolean);
}

function scoreText(text: string, tokens: string[]) {
  const haystack = normalizeText(text);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export function extractWorkOrderReference(query: string) {
  const match = query.match(/\bwo[-\s:]?(\d{1,6})\b/i);
  if (!match) {
    return null;
  }

  return `WO-${match[1].padStart(4, "0")}`;
}

function findReferencedWorkOrder(context: ThreadAiContext, query: string) {
  const workOrderReference = extractWorkOrderReference(query);
  if (!workOrderReference) {
    return null;
  }

  if (context.focusedWorkOrder?.workOrderNumber?.toUpperCase() === workOrderReference.toUpperCase()) {
    return context.focusedWorkOrder;
  }

  if (context.workOrder?.workOrderNumber?.toUpperCase() === workOrderReference.toUpperCase()) {
    return context.workOrder;
  }

  return (
    context.globalContext?.workOrders.find(
      (workOrder) => workOrder.workOrderNumber?.toUpperCase() === workOrderReference.toUpperCase(),
    ) ?? null
  );
}

function formatDateLabel(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `$${value.toFixed(2)}`;
}

function buildOverdueByClientAnswer(context: ThreadAiContext) {
  const globalContext = context.globalContext;
  if (!globalContext) {
    return null;
  }

  if (globalContext.overdueWorkOrders === 0) {
    return {
      answer: "There are currently no verified overdue work orders in the system.",
      citations: [],
    };
  }

  if (globalContext.overdueByClient.length === 0) {
    return {
      answer: `There are ${globalContext.overdueWorkOrders} overdue work orders in total, but I do not see any verified client names attached to those overdue orders in the current assistant data.`,
      citations: [],
    };
  }

  const clientBreakdown = globalContext.overdueByClient
    .map((entry) => `${entry.clientName}: ${entry.overdueWorkOrders}`)
    .join("; ");

  return {
    answer: `There are ${globalContext.overdueWorkOrders} verified overdue work orders in total. By client, the overdue count is: ${clientBreakdown}.`,
    citations: [],
  };
}

function buildFocusedWorkOrderAnswer(workOrder: AiFocusedWorkOrder, query: string) {
  const normalizedQuery = normalizeText(query);
  const wantsDetailedBreakdown =
    normalizedQuery.includes("bid") ||
    normalizedQuery.includes("completion") ||
    normalizedQuery.includes("field complete") ||
    normalizedQuery.includes("office approved") ||
    normalizedQuery.includes("sent to client") ||
    normalizedQuery.includes("invoice") ||
    normalizedQuery.includes("task") ||
    normalizedQuery.includes("message") ||
    normalizedQuery.includes("thread") ||
    normalizedQuery.includes("property") ||
    normalizedQuery.includes("focus") ||
    normalizedQuery.includes("mold") ||
    normalizedQuery.includes("debris");
  const wantsAllBidItems =
    normalizedQuery.includes("all bid") ||
    normalizedQuery.includes("all bids") ||
    normalizedQuery.includes("every bid");
  const wantsExtraShortAnswer =
    normalizedQuery.includes("short answer") ||
    normalizedQuery.includes("brief") ||
    normalizedQuery.includes("quick answer");

  const topBidItems = workOrder.bidItems
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const bidItemsToDescribe = wantsAllBidItems
    ? workOrder.bidItems.slice().sort((a, b) => b.total - a.total)
    : topBidItems;

  const primaryFocus = topBidItems
    .slice(0, 4)
    .map((item) => item.taskName.toLowerCase())
    .join(" ");

  const focusSummary = primaryFocus.includes("debris")
    ? primaryFocus.includes("mold")
      ? "This looks like a debris-heavy job with meaningful mold and interior-damage work layered in."
      : "This looks like a debris-heavy job rather than a mold-first job."
    : primaryFocus.includes("mold")
      ? "This looks more mold-focused than debris-focused."
      : "This order has a mixed repair and preservation scope.";

  const photoSummary = Object.entries(workOrder.photoCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");

  const officeApprovalMessage = workOrder.messageTimeline.find((message) =>
    normalizeText(message.body).includes("office review approved"),
  );
  const statusTone =
    workOrder.status === "SENT_TO_CLIENT"
      ? "This order is already out the door and sitting with the client."
      : workOrder.status === "OFFICE_APPROVED"
        ? "This order has made it through office review and looks ready for the client-facing finish line."
        : workOrder.status === "FIELD_COMPLETE"
          ? "Field work appears done and the order is sitting in the office-review stage."
          : `This order is currently in ${workOrder.status}.`;

  const teamLine = [
    workOrder.clientName ? `Client: ${workOrder.clientName}` : null,
    workOrder.assignedContractorName ? `Contractor: ${workOrder.assignedContractorName}` : null,
    workOrder.assignedCoordinatorName ? `Coordinator: ${workOrder.assignedCoordinatorName}` : null,
    workOrder.assignedProcessorName ? `Processor: ${workOrder.assignedProcessorName}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" | ");

  const summaryLead = `${workOrder.workOrderNumber ?? workOrder.id} is a ${workOrder.serviceType.toLowerCase().replace(/_/g, " ")} order at ${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state} ${workOrder.postalCode}. ${statusTone}`;

  const topDriversText = topBidItems
    .slice(0, wantsAllBidItems ? topBidItems.length : 4)
    .map((item) => `${item.taskName} (${formatMoney(item.total)})`)
    .join(", ");

  const completionText = workOrder.completionItems
    .map((item) => `${item.taskName} (${formatMoney(item.total)})`)
    .join(", ");

  const milestoneParts = [
    workOrder.assignedDate ? `assigned on ${formatDateLabel(workOrder.assignedDate)}` : null,
    workOrder.startDate ? `started on ${formatDateLabel(workOrder.startDate)}` : null,
    workOrder.fieldComplete ? `field completed on ${formatDateLabel(workOrder.fieldComplete)}` : null,
    officeApprovalMessage ? `office approval note posted on ${formatDateLabel(officeApprovalMessage.createdAt)}` : null,
    workOrder.invoiceSentToClientDate ? `sent to client on ${formatDateLabel(workOrder.invoiceSentToClientDate)}` : null,
  ].filter((part): part is string => Boolean(part));

  const recentNotesSummary = workOrder.messageTimeline
    .slice(-3)
    .map((message) => `${message.authorName ?? "Unknown"}: ${message.body}`)
    .join(" ");

  if (wantsExtraShortAnswer && !wantsDetailedBreakdown) {
    return [
      summaryLead,
      focusSummary,
      teamLine || null,
      workOrder.dueDate ? `Due date is ${formatDateLabel(workOrder.dueDate)}.` : null,
      workOrder.invoiceStatus
        ? `Invoice status is ${workOrder.invoiceStatus}${workOrder.invoiceNumber ? ` under ${workOrder.invoiceNumber}` : ""}.`
        : "No invoice is recorded yet.",
    ]
      .filter((line): line is string => Boolean(line))
      .join(" ");
  }

  const paragraphs = [
    summaryLead,
    [
      focusSummary,
      `From the stored work package, there are ${workOrder.bidItems.length} bid items and ${workOrder.completionItems.length} completion items tied to this order.`,
      workOrder.description ? `The description on the order is: ${workOrder.description}` : null,
      teamLine || null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(" "),
    bidItemsToDescribe.length > 0
      ? `${
          wantsAllBidItems
            ? "The full bid package shows work across debris, repair, and stabilization items, including"
            : "The strongest cost drivers in the bid are"
        } ${topDriversText}.`
      : "No bid items are stored on this work order.",
    workOrder.completionItems.length > 0
      ? `On the completion side, the record shows ${completionText}.`
      : "No completion items are stored on this work order.",
    milestoneParts.length > 0
      ? `Timeline-wise, the order was ${milestoneParts.join(", ")}.${workOrder.estCompletion ? ` The estimated completion date was ${formatDateLabel(workOrder.estCompletion)}.` : ""}${workOrder.dueDate ? ` The due date was ${formatDateLabel(workOrder.dueDate)}.` : ""}`
      : null,
    workOrder.invoiceStatus
      ? `Billing is currently at ${workOrder.invoiceStatus}${workOrder.invoiceNumber ? ` under invoice ${workOrder.invoiceNumber}` : ""}${formatMoney(workOrder.invoiceTotal) ? ` for ${formatMoney(workOrder.invoiceTotal)}` : ""}${workOrder.invoiceDate ? `, dated ${formatDateLabel(workOrder.invoiceDate)}` : ""}.${workOrder.invoiceNotes ? ` ${workOrder.invoiceNotes}` : ""}`
      : "No invoice is recorded yet.",
    photoSummary ? `Photo coverage on file is ${photoSummary}.` : null,
    recentNotesSummary
      ? `Recent thread activity is mostly ${recentNotesSummary}`
      : "The thread does not show any meaningful operational notes beyond simple greeting messages.",
  ].filter((line): line is string => Boolean(line));

  return paragraphs.join("\n\n");
}

function extractActionLines(messages: AiMessage[]) {
  const patterns = [
    /\bneed to\b/i,
    /\bplease\b/i,
    /\baction\b/i,
    /\bfollow up\b/i,
    /\bassign\b/i,
    /\bschedule\b/i,
    /\bdue\b/i,
    /\bcan you\b/i,
    /\bshould\b/i,
  ];

  return messages
    .filter((message) => patterns.some((pattern) => pattern.test(message.body)))
    .slice(-8)
    .reverse()
    .map((message) => ({
      id: message.id,
      text: message.body.replace(/\s+/g, " ").trim(),
      owner: message.createdByUser?.name ?? "Team",
      createdAt: message.createdAt,
    }));
}

export function buildThreadAiInsights(context: ThreadAiContext) {
  const recentMessages = context.messages
    .filter((message) => message.body.trim())
    .slice(-8)
    .reverse();

  const latestMessage = recentMessages[0];
  const openTasks = context.tasks.filter((task) => task.status === "OPEN");
  const latestFiles = context.attachments.slice(0, 3).map((attachment) => attachment.fileName);
  const actionItems = extractActionLines(context.messages);
  const workOrder = context.workOrder;
  const globalContext = context.globalContext;
  const upcomingMeetings = context.meetings
    .filter((meeting) => meeting.status === "SCHEDULED")
    .slice(0, 2)
    .map((meeting) => `${meeting.title} on ${new Date(meeting.startsAt).toLocaleString()}`);

  const summary = [
    workOrder
      ? `This thread is tied to work order ${workOrder.workOrderNumber ?? workOrder.id} for ${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state}. Current status is ${workOrder.status.toLowerCase()}${
          workOrder.dueDate ? ` and it is due ${new Date(workOrder.dueDate).toLocaleDateString()}.` : "."
        }`
      : null,
    latestMessage
      ? `${latestMessage.createdByUser?.name ?? "Someone"} most recently said ${JSON.stringify(
          latestMessage.body.replace(/\s+/g, " ").slice(0, 160)
        )}.`
      : `No recent messages yet in ${context.threadName}.`,
    openTasks.length > 0
      ? `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} still need attention${
          openTasks.some((task) => task.dueAt) ? ", including upcoming due dates." : "."
        }`
      : "There are no open tasks right now.",
    latestFiles.length > 0
      ? `Recent shared files include ${latestFiles.join(", ")}.`
      : "No recent file shares were found in this thread.",
    upcomingMeetings.length > 0
      ? `Scheduled meetings: ${upcomingMeetings.join("; ")}.`
      : "No scheduled meetings are recorded for this thread.",
    workOrder?.invoiceStatus
      ? `Invoice status is ${workOrder.invoiceStatus.toLowerCase()}${workOrder.invoiceNumber ? ` under invoice ${workOrder.invoiceNumber}` : ""}${typeof workOrder.invoiceTotal === "number" ? ` with total ${workOrder.invoiceTotal.toFixed(2)}` : ""}.`
      : "No invoice has been attached to this work order yet.",
    globalContext
      ? `${globalContext.totalWorkOrders} work orders are in Helper's site view, with ${globalContext.openWorkOrders} open and ${globalContext.overdueWorkOrders} overdue.`
      : null,
  ].filter((line): line is string => Boolean(line));

  const smartReplies = [
    latestMessage
      ? `Thanks ${latestMessage.createdByUser?.name ?? "team"}, I’m on it and will update here shortly.`
      : "Thanks everyone. I’ll keep this thread updated.",
    openTasks.length > 0
      ? `I reviewed the open items. I’ll take the next step on ${openTasks[0]?.title ?? "the pending task"} and confirm timing here.`
      : "Looks good from my side. Let me know if you want me to create a follow-up task.",
    "Can we confirm owner, due date, and next action so nothing slips?",
  ];

  const meetingNotes = recentMessages.slice(0, 5).map((message) => {
    const age = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true });
    return `${message.createdByUser?.name ?? "Team"} (${age}): ${message.body.replace(/\s+/g, " ").slice(0, 140)}${message.body.length > 140 ? "..." : ""}`;
  });

  return {
    summary,
    smartReplies,
    actionItems: actionItems.map((item) => ({
      id: item.id,
      title: item.text.length > 120 ? `${item.text.slice(0, 117)}...` : item.text,
      owner: item.owner,
      sourceMessageId: item.id,
    })),
    meetingNotes,
  };
}

export function runNaturalLanguageThreadSearch(context: ThreadAiContext, query: string): NaturalLanguageSearchResult {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { messages: [], files: [], users: [], documents: [] };
  }

  const messages = context.messages
    .map((message) => ({
      id: message.id,
      body: message.body,
      author: message.createdByUser?.name ?? "Unknown",
      createdAt: message.createdAt,
      score:
        scoreText(message.body, tokens) +
        scoreText(message.createdByUser?.name ?? "", tokens) +
        (tokens.some((token) => ["latest", "recent", "new"].includes(token)) ? 1 : 0),
    }))
    .filter((message) => message.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const files = context.attachments
    .map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      score: scoreText(attachment.fileName, tokens),
    }))
    .filter((attachment) => attachment.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const users = context.participants
    .map((user) => ({
      id: user.id,
      name: user.name,
      roleName: user.roleName ?? null,
      score: scoreText(`${user.name} ${user.roleName ?? ""}`, tokens),
    }))
    .filter((user) => user.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const documents = (context.knowledgeDocuments ?? [])
    .map((document) => ({
      id: document.id,
      fileName: document.fileName,
      filePath: document.filePath,
      excerpt: document.excerpt ?? "",
      score: scoreText(`${document.fileName} ${document.filePath} ${document.excerpt ?? ""}`, tokens),
    }))
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const globalMessages = (context.globalContext?.workOrders ?? [])
    .map((workOrder) => ({
      id: workOrder.id,
      body: [
        workOrder.workOrderNumber,
        workOrder.title,
        workOrder.addressLine1,
        workOrder.city,
        workOrder.state,
        workOrder.postalCode,
        workOrder.status,
        workOrder.clientName,
        workOrder.assignedContractorName,
        workOrder.assignedCoordinatorName,
        workOrder.assignedProcessorName,
        workOrder.invoiceStatus,
        workOrder.invoiceNumber,
      ]
        .filter(Boolean)
        .join(" "),
      author: workOrder.clientName ?? "Operations",
      createdAt: workOrder.dueDate ?? new Date().toISOString(),
      score: scoreText(
        [
          workOrder.workOrderNumber,
          workOrder.title,
          workOrder.addressLine1,
          workOrder.city,
          workOrder.state,
          workOrder.status,
          workOrder.clientName,
          workOrder.invoiceStatus,
          workOrder.invoiceNumber,
        ]
          .filter(Boolean)
          .join(" "),
        tokens,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    messages: messages.length > 0 ? messages : globalMessages,
    files,
    users,
    documents,
  };
}

export function answerThreadAssistantQuestion(context: ThreadAiContext, query: string) {
  const insights = buildThreadAiInsights(context);
  const search = runNaturalLanguageThreadSearch(context, query);
  const normalizedQuery = normalizeText(query);
  const referencedWorkOrder = findReferencedWorkOrder(context, query);
  const hasWorkOrderReference = Boolean(extractWorkOrderReference(query));
  const wantsOverdueByClient =
    normalizedQuery.includes("overdue") &&
    (normalizedQuery.includes("client") ||
      normalizedQuery.includes("customer") ||
      normalizedQuery.includes("by client") ||
      normalizedQuery.includes("per client") ||
      normalizedQuery.includes("each client"));

  if (context.focusedWorkOrder && hasWorkOrderReference) {
    return {
      answer: buildFocusedWorkOrderAnswer(context.focusedWorkOrder, query),
      citations: context.focusedWorkOrder.messageTimeline.slice(-3).map((item) => item.id),
    };
  }

  if (wantsOverdueByClient) {
    const overdueByClientAnswer = buildOverdueByClientAnswer(context);
    if (overdueByClientAnswer) {
      return overdueByClientAnswer;
    }
  }

  if (normalizedQuery.includes("summary") || normalizedQuery.includes("catch up")) {
    return {
      answer: insights.summary.join(" "),
      citations: search.messages.slice(0, 3).map((item) => item.id),
    };
  }

  if (normalizedQuery.includes("task") || normalizedQuery.includes("action")) {
    const taskLine =
      context.tasks.length > 0
        ? context.tasks
            .slice(0, 4)
            .map((task) => `${task.title} (${task.status.toLowerCase()}${task.assignedToUser?.name ? `, ${task.assignedToUser.name}` : ""})`)
            .join("; ")
        : "There are no tracked tasks in this thread.";
    return {
      answer: `Here’s the current task picture: ${taskLine}`,
      citations: insights.actionItems.slice(0, 3).map((item) => item.sourceMessageId),
    };
  }

  if (
    normalizedQuery.includes("work order") ||
    normalizedQuery.includes("address") ||
    normalizedQuery.includes("client") ||
    normalizedQuery.includes("invoice") ||
    normalizedQuery.includes("due date") ||
    normalizedQuery.includes("status")
  ) {
    if (!context.workOrder) {
      const globalMatch = referencedWorkOrder;
      if (!globalMatch) {
        return {
          answer: "I don’t see a verified matching work order for that request in the current assistant view yet.",
          citations: [],
        };
      }

      const parts = [
        `The closest work order match is ${globalMatch.workOrderNumber ?? globalMatch.id} for ${globalMatch.addressLine1}, ${globalMatch.city}, ${globalMatch.state}.`,
        `Current status is ${globalMatch.status.toLowerCase()}.`,
        globalMatch.clientName ? `Client is ${globalMatch.clientName}.` : null,
        globalMatch.assignedContractorName ? `Assigned contractor is ${globalMatch.assignedContractorName}.` : "No contractor is assigned yet.",
        globalMatch.assignedCoordinatorName ? `Coordinator is ${globalMatch.assignedCoordinatorName}.` : null,
        globalMatch.assignedProcessorName ? `Processor is ${globalMatch.assignedProcessorName}.` : null,
        globalMatch.dueDate ? `Due date is ${new Date(globalMatch.dueDate).toLocaleDateString()}.` : "No due date is set.",
        globalMatch.invoiceStatus ? `Invoice status is ${globalMatch.invoiceStatus.toLowerCase()}.` : "No invoice is attached yet.",
      ].filter((part): part is string => Boolean(part));

      return {
        answer: parts.join(" "),
        citations: [],
      };
    }

    const workOrder = context.workOrder;
    const parts = [
      `Work order ${workOrder.workOrderNumber ?? workOrder.id} is for ${workOrder.addressLine1}, ${workOrder.city}, ${workOrder.state}.`,
      `Current status is ${workOrder.status.toLowerCase()}.`,
      workOrder.clientName ? `Client is ${workOrder.clientName}.` : null,
      workOrder.assignedContractorName ? `Assigned contractor is ${workOrder.assignedContractorName}.` : "No contractor is assigned yet.",
      workOrder.assignedCoordinatorName ? `Coordinator is ${workOrder.assignedCoordinatorName}.` : null,
      workOrder.assignedProcessorName ? `Processor is ${workOrder.assignedProcessorName}.` : null,
      workOrder.dueDate ? `Due date is ${new Date(workOrder.dueDate).toLocaleDateString()}.` : "No due date is set.",
      workOrder.invoiceStatus ? `Invoice status is ${workOrder.invoiceStatus.toLowerCase()}.` : "No invoice is attached yet.",
    ].filter((part): part is string => Boolean(part));

    return {
      answer: parts.join(" "),
      citations: [],
    };
  }

  if (normalizedQuery.includes("meeting") || normalizedQuery.includes("notes") || normalizedQuery.includes("inspection") || normalizedQuery.includes("schedule")) {
    if (context.meetings.length > 0) {
      const meetingLines = context.meetings
        .slice(0, 3)
        .map((meeting) => `${meeting.title} (${meeting.status.toLowerCase()}) on ${new Date(meeting.startsAt).toLocaleString()}`);
      return {
        answer: `Here are the verified meeting records I can see: ${meetingLines.join("; ")}`,
        citations: [],
      };
    }

    return {
      answer:
        insights.meetingNotes.length > 0
          ? `Meeting-style notes from the thread: ${insights.meetingNotes.slice(0, 3).join(" ")}`
          : "I do not see any verified meeting or schedule records for this thread right now.",
      citations: search.messages.slice(0, 3).map((item) => item.id),
    };
  }

  if (search.messages.length === 0 && search.files.length === 0 && search.users.length === 0 && search.documents.length === 0) {
    return {
      answer:
        "I don’t have a verified match for that yet from the current thread, work-order data, or connected reference material. Try asking about the work order, pricing, a person, a task, due date, invoice, or ask for a summary.",
      citations: [],
    };
  }

  const topMessage = search.messages[0];
  if (topMessage) {
    return {
      answer: `The closest match I found is from ${topMessage.author}: ${topMessage.body.replace(/\s+/g, " ").slice(0, 180)}${topMessage.body.length > 180 ? "..." : ""}`,
      citations: [topMessage.id],
    };
  }

  if (search.files[0]) {
    return {
      answer: "I found a likely match in the attached thread files that should help answer this.",
      citations: [],
    };
  }

  if (search.documents[0]) {
    const document = search.documents[0];
    const excerpt = document.excerpt ? ` ${document.excerpt.slice(0, 220)}${document.excerpt.length > 220 ? "..." : ""}` : "";
    return {
      answer: `I found a matching detail in the connected reference material.${excerpt}`,
      citations: [],
    };
  }

  return {
    answer: `The closest user match is ${search.users[0]?.name}.`,
    citations: [],
  };
}
