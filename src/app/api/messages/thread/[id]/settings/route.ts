import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAppSession } from "@/lib/app-session";
import { createChannelImageDataUrl, validateChannelImageFile } from "@/lib/channel-image";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

type UploadableFile = File & {
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function isNamedChannelTitle(value: string | null) {
  return Boolean(value) && value !== "Operational Thread" && value !== "General Work Order Thread";
}

export async function POST(request: Request, contextArg: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await contextArg.params;
  const threadId = params.id;
  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context could not be loaded." }, { status: 400 });
  }

  const allowed = await canAccessMessageThread(context, threadId);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      title: true,
      channelImageUrl: true,
      threadType: true,
      workOrderId: true,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const isNamedChannel =
    thread.threadType === "GENERAL" && !thread.workOrderId && isNamedChannelTitle(thread.title);
  if (!isNamedChannel) {
    return NextResponse.json({ error: "Only named channels can be updated here." }, { status: 400 });
  }

  const formData = await request.formData();
  const rawTitle = String(formData.get("title") ?? "").trim();
  const photo = formData.get("photo");

  let channelImageUrl = thread.channelImageUrl;
  const isFile =
    typeof photo === "object" &&
    photo !== null &&
    "size" in photo &&
    typeof photo.size === "number" &&
    "arrayBuffer" in photo &&
    typeof photo.arrayBuffer === "function" &&
    photo.size > 0;
  if (isFile) {
    const photoFile = photo as UploadableFile;
    const validationError = validateChannelImageFile(photoFile);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    channelImageUrl = await createChannelImageDataUrl(photoFile);
  }

  const data: { title?: string; channelImageUrl?: string | null } = {};
  if (rawTitle) {
    data.title = rawTitle;
  }
  if (channelImageUrl !== thread.channelImageUrl) {
    data.channelImageUrl = channelImageUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await db.messageThread.update({
    where: { id: threadId },
    data,
    select: {
      id: true,
      title: true,
      channelImageUrl: true,
    },
  });

  await writeAuditLog({
    actorUserId: session.id,
    action: "message.channel_updated",
    entityType: "message_thread",
    entityId: threadId,
    metadata: {
      previousTitle: thread.title,
      nextTitle: updated.title,
      channelImageUpdated: updated.channelImageUrl !== thread.channelImageUrl,
    },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    displayName: updated.title ?? "Channel",
    channelImageUrl: updated.channelImageUrl,
  });
}
