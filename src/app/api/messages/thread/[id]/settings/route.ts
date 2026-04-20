import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

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
  const isFile = typeof photo === "object" && photo !== null && "size" in photo && "arrayBuffer" in photo;
  if (isFile && (photo as any).size > 0) {
    const photoFile = photo as File;
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowedTypes.has(photoFile.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
    }

    const extension = photoFile.name.includes(".") ? photoFile.name.split(".").pop() : "jpg";
    const fileName = `${thread.id}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "channels");
    const targetPath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await photo.arrayBuffer());
    await writeFile(targetPath, buffer);
    channelImageUrl = `/uploads/channels/${fileName}`;
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
