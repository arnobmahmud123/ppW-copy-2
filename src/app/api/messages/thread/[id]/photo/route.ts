export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAppSession } from "@/lib/app-session";
import { createChannelImageDataUrl, validateChannelImageFile } from "@/lib/channel-image";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

type UploadableFile = File & {
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export async function POST(
  request: NextRequest,
  contextArg: { params: Promise<{ id: string }> }
) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await contextArg.params;

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
    select: { id: true, title: true, channelImageUrl: true },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not parse upload data." }, { status: 400 });
  }

  const photo = formData.get("photo");
  const isFile =
    typeof photo === "object" &&
    photo !== null &&
    "size" in photo &&
    typeof photo.size === "number" &&
    "arrayBuffer" in photo &&
    typeof photo.arrayBuffer === "function" &&
    photo.size > 0;

  if (!isFile) {
    return NextResponse.json({ error: "No valid photo file received." }, { status: 400 });
  }

  const photoFile = photo as UploadableFile;
  const validationError = validateChannelImageFile(photoFile);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const channelImageUrl = await createChannelImageDataUrl(photoFile);

  const updated = await db.messageThread.update({
    where: { id: threadId },
    data: { channelImageUrl },
    select: { id: true, title: true, channelImageUrl: true },
  });

  await writeAuditLog({
    actorUserId: session.id,
    action: "message.channel_photo_updated",
    entityType: "message_thread",
    entityId: threadId,
    metadata: { previousImageUrl: thread.channelImageUrl, nextImageUrl: channelImageUrl },
  }).catch(() => {}); // non-blocking

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    displayName: updated.title ?? "Channel",
    channelImageUrl: updated.channelImageUrl,
  });
}

export async function DELETE(
  request: NextRequest,
  contextArg: { params: Promise<{ id: string }> }
) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await contextArg.params;

  const context = await getMessagingAccessContext(session.id);
  if (!context) {
    return NextResponse.json({ error: "Messaging context could not be loaded." }, { status: 400 });
  }

  const allowed = await canAccessMessageThread(context, threadId);
  if (!allowed) {
    return NextResponse.json({ error: "Thread access is not allowed." }, { status: 403 });
  }

  const updated = await db.messageThread.update({
    where: { id: threadId },
    data: { channelImageUrl: null },
    select: { id: true, title: true, channelImageUrl: true },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    displayName: updated.title ?? "Channel",
    channelImageUrl: updated.channelImageUrl,
  });
}
