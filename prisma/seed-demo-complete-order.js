const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

const TARGET_WORK_ORDER_ID = "cmnp33tfo005hj1nhfuuc3eu7";
const TARGET_THREAD_ID = "cmnwa3b280001j1smeygtgvpm";
const ADMIN_USER_ID = "cmnp33t4y0000j1ngrqetuxrs";
const CONTRACTOR_USER_ID = "cmnp33t5f0008j1ngnldbqk1g";
const COORDINATOR_USER_ID = "cmnp33t550002j1ngaj0ogese";
const PROCESSOR_USER_ID = "cmnp33t590004j1ng670p8buv";

function photoUrl(seed) {
  return `https://picsum.photos/seed/${seed}/1600/1200`;
}

function createUpload(seed, label) {
  return {
    id: `demo-${seed}-${label}`,
    url: photoUrl(`${seed}-${label}`),
  };
}

function createRequirement(taskId, type, label, uploads) {
  return {
    id: `${taskId}-${type.toLowerCase()}`,
    type,
    label,
    required: true,
    uploaded: uploads.length > 0,
    url: uploads[0]?.url,
    uploads,
  };
}

function createBidTask(index, item) {
  const taskId = `demo-bid-${String(index + 1).padStart(2, "0")}`;
  const uploads = [createUpload(taskId, "bid-photo")];
  return {
    id: taskId,
    taskType: "Bid",
    taskName: item.taskName,
    customTaskName: "",
    qty: item.qty,
    uom: item.uom,
    contractorPrice: item.contractorPrice,
    clientPrice: item.clientPrice,
    comments: item.comments,
    violation: Boolean(item.violation),
    damage: Boolean(item.damage),
    hazards: Boolean(item.hazards),
    photoRequirements: [
      createRequirement(taskId, "BID", "Bid Photos", uploads),
    ],
  };
}

function createCompletionTask(taskId, item) {
  const beforeUploads = [createUpload(taskId, "before")];
  const duringUploads = [createUpload(taskId, "during")];
  const afterUploads = [createUpload(taskId, "after")];

  return {
    id: taskId,
    taskType: "Completion",
    taskName: item.taskName,
    customTaskName: "",
    qty: item.qty,
    uom: item.uom,
    contractorPrice: item.contractorPrice,
    clientPrice: item.clientPrice,
    comments: item.comments,
    violation: Boolean(item.violation),
    damage: Boolean(item.damage),
    hazards: Boolean(item.hazards),
    photoRequirements: [
      createRequirement(taskId, "BEFORE", "Before Photos", beforeUploads),
      createRequirement(taskId, "DURING", "During Photos", duringUploads),
      createRequirement(taskId, "AFTER", "After Photos", afterUploads),
    ],
  };
}

function collectFileAttachments(workOrderId, tasks) {
  const categoryByType = {
    BID: "PHOTO_BID",
    BEFORE: "PHOTO_BEFORE",
    DURING: "PHOTO_DURING",
    AFTER: "PHOTO_AFTER",
    INSPECTION: "PHOTO_INSPECTION",
  };

  return tasks.flatMap((task) =>
    (task.photoRequirements || []).flatMap((requirement) =>
      (requirement.uploads || []).map((upload, index) => ({
        id: upload.id,
        url: upload.url,
        key: `demo/${workOrderId}/${task.id}/${requirement.type.toLowerCase()}-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        category: categoryByType[requirement.type] || "OTHER",
        taskId: task.id,
        requirementId: requirement.id,
        workOrderId,
      }))
    )
  );
}

async function main() {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: TARGET_WORK_ORDER_ID },
    select: {
      id: true,
      workOrderNumber: true,
      clientId: true,
      invoice: { select: { id: true } },
    },
  });

  if (!workOrder) {
    throw new Error(`Work order ${TARGET_WORK_ORDER_ID} not found`);
  }

  const bidItems = [
    { taskName: "Exterior debris removal", qty: 12, uom: "CYD", contractorPrice: 34, clientPrice: 82, comments: "Bid to remove mixed exterior debris and dispose offsite." },
    { taskName: "Interior debris removal", qty: 8, uom: "CYD", contractorPrice: 38, clientPrice: 91, comments: "Interior debris haul-out from basement and rear bedroom." },
    { taskName: "Appliance removal", qty: 3, uom: "EACH", contractorPrice: 52, clientPrice: 135, comments: "Remove refrigerator, stove, and washer from property." },
    { taskName: "Carpet removal", qty: 650, uom: "SQFT", contractorPrice: 0.55, clientPrice: 1.85, comments: "Tear out damaged carpet and pad in main living spaces." },
    { taskName: "Drywall debris bag-out", qty: 18, uom: "BAGS", contractorPrice: 8, clientPrice: 24, comments: "Bag and remove drywall debris from hallway and kitchen." },
    { taskName: "Garage clean-out", qty: 1, uom: "LOT", contractorPrice: 145, clientPrice: 360, comments: "Full garage trash-out including loose shelving and boxes." },
    { taskName: "Shed debris haul-away", qty: 1, uom: "LOT", contractorPrice: 165, clientPrice: 395, comments: "Remove deteriorated storage items from rear shed." },
    { taskName: "Fence panel reset", qty: 4, uom: "PANELS", contractorPrice: 28, clientPrice: 92, comments: "Reset leaning rear fence panels and secure posts." },
    { taskName: "Handrail stabilization", qty: 18, uom: "LNFT", contractorPrice: 11, clientPrice: 34, comments: "Re-secure loose rear porch handrail for safe access." },
    { taskName: "Trip hazard grinding", qty: 95, uom: "SQFT", contractorPrice: 1.4, clientPrice: 3.9, comments: "Grind and feather raised concrete hazard near garage entry." },
    { taskName: "Window board-up", qty: 5, uom: "EACH", contractorPrice: 48, clientPrice: 126, comments: "Secure broken lower-level windows with painted plywood." },
    { taskName: "Door re-secure", qty: 2, uom: "EACH", contractorPrice: 64, clientPrice: 158, comments: "Re-hang detached side entry doors and install latch hardware." },
    { taskName: "Lock change", qty: 3, uom: "EACH", contractorPrice: 29, clientPrice: 78, comments: "Change front, side, and basement entry locks." },
    { taskName: "Lockbox install", qty: 1, uom: "EACH", contractorPrice: 26, clientPrice: 72, comments: "Install combo lockbox at front entry for access control." },
    { taskName: "Grass cut and edge", qty: 10000, uom: "SQFT", contractorPrice: 0.012, clientPrice: 0.03, comments: "Mow, edge, and trim front and rear yard to curb appeal standards." },
    { taskName: "Weed treatment", qty: 1, uom: "LOT", contractorPrice: 48, clientPrice: 132, comments: "Spot treat overgrowth along fence line and walk path." },
    { taskName: "Shrub trim", qty: 14, uom: "EACH", contractorPrice: 6, clientPrice: 18, comments: "Trim overgrown shrubs away from windows and walkways." },
    { taskName: "Tree limb cutback", qty: 3, uom: "EACH", contractorPrice: 34, clientPrice: 96, comments: "Cut back low tree limbs touching roof edge." },
    { taskName: "Roof tarp placement", qty: 220, uom: "SQFT", contractorPrice: 1.85, clientPrice: 4.9, comments: "Install emergency tarp over rear garage roof opening." },
    { taskName: "Ceiling stain seal", qty: 180, uom: "SQFT", contractorPrice: 1.2, clientPrice: 3.6, comments: "Seal visible water stains in living room ceiling." },
    { taskName: "Mold treatment", qty: 140, uom: "SQFT", contractorPrice: 2.95, clientPrice: 7.4, comments: "Apply antimicrobial treatment in lower-level wall cavity." },
    { taskName: "Bathroom vanity removal", qty: 1, uom: "EACH", contractorPrice: 72, clientPrice: 185, comments: "Remove damaged vanity and cap plumbing safely." },
    { taskName: "Toilet reset", qty: 2, uom: "EACH", contractorPrice: 58, clientPrice: 148, comments: "Reset loose toilets and replace wax rings." },
    { taskName: "Subfloor patch", qty: 120, uom: "SQFT", contractorPrice: 2.1, clientPrice: 5.7, comments: "Patch soft subfloor areas in hallway and bath." },
    { taskName: "Cabinet debris removal", qty: 10, uom: "EACH", contractorPrice: 18, clientPrice: 44, comments: "Remove broken upper and lower cabinets from kitchen." },
    { taskName: "Interior door replacement", qty: 4, uom: "EACH", contractorPrice: 84, clientPrice: 214, comments: "Replace damaged hollow-core interior doors." },
    { taskName: "Smoke detector install", qty: 5, uom: "EACH", contractorPrice: 16, clientPrice: 44, comments: "Install new smoke detectors per local compliance." },
    { taskName: "CO detector install", qty: 3, uom: "EACH", contractorPrice: 19, clientPrice: 52, comments: "Install carbon monoxide detectors on each occupied level." },
    { taskName: "Final heavy clean", qty: 1, uom: "LOT", contractorPrice: 225, clientPrice: 560, comments: "Full heavy clean after debris removal and repair work." },
    { taskName: "General contingency allowance", qty: 1, uom: "LOT", contractorPrice: 150, clientPrice: 425, comments: "Allowance for minor unforeseen debris and disposal overages." },
  ];

  const completionItems = [
    {
      taskId: "demo-completion-01",
      taskName: "Exterior debris haul and disposal",
      qty: 12,
      uom: "CYD",
      contractorPrice: 38,
      clientPrice: 85,
      comments: "Exterior debris piles removed from driveway, side yard, and rear patio. Area left broom clean.",
    },
    {
      taskId: "demo-completion-02",
      taskName: "Interior debris haul-out",
      qty: 8,
      uom: "CYD",
      contractorPrice: 42,
      clientPrice: 95,
      comments: "Interior debris removed from basement, hallway, and rear bedroom with bagged trash disposed properly.",
    },
    {
      taskId: "demo-completion-03",
      taskName: "Appliance and bulk item removal",
      qty: 3,
      uom: "EACH",
      contractorPrice: 55,
      clientPrice: 145,
      comments: "Removed refrigerator, stove, and washer/dryer set from the property and disposed offsite.",
    },
    {
      taskId: "demo-completion-04",
      taskName: "Final sweep and curb-ready finish",
      qty: 1,
      uom: "LOT",
      contractorPrice: 180,
      clientPrice: 420,
      comments: "Completed final sweep, bagged small remaining debris, and staged property for office approval.",
    },
  ];

  const bidTasks = bidItems.map((item, index) => createBidTask(index, item));
  const completionTasks = completionItems.map((item) =>
    createCompletionTask(item.taskId, item)
  );
  const allTasks = [...bidTasks, ...completionTasks];
  const fileAttachments = collectFileAttachments(workOrder.id, allTasks);

  const invoiceItems = completionTasks.map((task, index) => {
    const total = Number(task.qty) * Number(task.clientPrice);
    return {
      id: `demo-invoice-item-${String(index + 1).padStart(2, "0")}`,
      item: task.taskName,
      qty: Number(task.qty),
      price: Number(task.clientPrice),
      total,
      adjPrice: 0,
      discountPercent: 0,
      finalTotal: total,
      comments: task.comments,
      flatFee: task.uom === "LOT",
    };
  });

  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + item.finalTotal, 0);
  const now = new Date();
  const assignedDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fieldComplete = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.fileAttachment.deleteMany({
      where: {
        workOrderId: workOrder.id,
        key: {
          startsWith: `demo/${workOrder.id}/`,
        },
      },
    });

    await tx.workOrderMessage.deleteMany({
      where: {
        workOrderId: workOrder.id,
        systemEventKey: {
          in: ["demo-bid-package", "demo-office-approval"],
        },
      },
    });

    if (workOrder.invoice?.id) {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: workOrder.invoice.id },
      });
      await tx.invoice.delete({
        where: { id: workOrder.invoice.id },
      });
    }

    await tx.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: "OFFICE_APPROVED",
        assignedCoordinatorId: COORDINATOR_USER_ID,
        assignedProcessorId: PROCESSOR_USER_ID,
        assignedContractorId: CONTRACTOR_USER_ID,
        assignedDate,
        startDate,
        estCompletion: fieldComplete,
        fieldComplete,
        tasks: JSON.stringify(allTasks),
      },
    });

    await tx.fileAttachment.createMany({
      data: fileAttachments,
    });

    const invoice = await tx.invoice.create({
      data: {
        workOrderId: workOrder.id,
        clientId: workOrder.clientId,
        invoiceNumber: `INV-${workOrder.workOrderNumber || "WO-0099"}-DEMO`,
        invoiceDate: fieldComplete,
        status: "SENT",
        sentToClientDate: new Date(fieldComplete.getTime() + 4 * 60 * 60 * 1000),
        completeDate: fieldComplete,
        noCharge: false,
        clientTotal: invoiceTotal,
        notes: "Demo invoice generated after completion review and office approval.",
      },
    });

    await tx.invoiceItem.createMany({
      data: invoiceItems.map((item) => ({
        ...item,
        invoiceId: invoice.id,
      })),
    });

    await tx.workOrderMessage.createMany({
      data: [
        {
          id: "demo-thread-note-bids",
          messageThreadId: TARGET_THREAD_ID,
          workOrderId: workOrder.id,
          visibilityScope: "INTERNAL_ONLY",
          messageType: "BID_UPDATE",
          authorType: "SYSTEM",
          urgency: "NORMAL",
          body: "Demo bid package loaded with 30 line items and supporting bid photos for review.",
          systemEventKey: "demo-bid-package",
          createdByUserId: ADMIN_USER_ID,
          createdAt: new Date(fieldComplete.getTime() - 12 * 60 * 60 * 1000),
          updatedAt: new Date(fieldComplete.getTime() - 12 * 60 * 60 * 1000),
        },
        {
          id: "demo-thread-note-approval",
          messageThreadId: TARGET_THREAD_ID,
          workOrderId: workOrder.id,
          visibilityScope: "INTERNAL_ONLY",
          messageType: "ACCOUNTING_NOTE",
          authorType: "SYSTEM",
          urgency: "NORMAL",
          body: `Office review approved. Invoice INV-${workOrder.workOrderNumber || "WO-0099"}-DEMO created for $${invoiceTotal.toFixed(2)} and order moved to Office Approved.`,
          systemEventKey: "demo-office-approval",
          createdByUserId: ADMIN_USER_ID,
          createdAt: new Date(fieldComplete.getTime() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(fieldComplete.getTime() - 2 * 60 * 60 * 1000),
        },
      ],
    });
  });

  console.log(`✅ Demo completion package loaded for ${workOrder.workOrderNumber || workOrder.id}`);
  console.log(`   • Bid items: ${bidTasks.length}`);
  console.log(`   • Completion items: ${completionTasks.length}`);
  console.log(`   • Photo attachments: ${fileAttachments.length}`);
  console.log(`   • Invoice total: $${invoiceTotal.toFixed(2)}`);
}

main()
  .catch((error) => {
    console.error("Demo seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
