export const runtime = "nodejs";

import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessageThread, getMessagingAccessContext } from "@/modules/messaging";

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
    "arrayBuffer" in photo &&
    (photo as any).size > 0;

  if (!isFile) {
    return NextResponse.json({ error: "No valid photo file received." }, { status: 400 });
  }

  const photoFile = photo as File;
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedTypes.has(photoFile.type)) {
    return NextResponse.json({ error: "Use a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
  }

  const rawExt = photoFile.name.includes(".") ? photoFile.name.split(".").pop() : "jpg";
  const safeExt = (rawExt || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const fileName = `${thread.id}-${randomUUID()}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "channels");
  const targetPath = path.join(uploadDir, fileName);

  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await writeFile(targetPath, buffer);
  } catch (err) {
    console.error("Channel photo write error:", err);
    return NextResponse.json({ error: "Failed to save image file." }, { status: 500 });
  }

  const channelImageUrl = `/uploads/channels/${fileName}`;

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
