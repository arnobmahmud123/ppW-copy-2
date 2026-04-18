import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessage, getMessagingAccessContext } from "@/modules/messaging/permissions";

async function translateText(text: string, targetLanguage: string) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString(), {
    headers: {
      "accept": "application/json,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error("Translation provider unavailable");
  }

  const payload = await response.json();
  const translated = Array.isArray(payload?.[0])
    ? payload[0].map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? "") : "")).join("")
    : "";

  if (!translated) {
    throw new Error("No translation result returned");
  }

  return translated;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getMessagingAccessContext(session.id);
  if (!access) {
    return NextResponse.json({ error: "Messaging context unavailable" }, { status: 403 });
  }

  const { id } = await context.params;
  const allowed = await canAccessMessage(access, id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const targetLanguage = typeof payload.targetLanguage === "string" ? payload.targetLanguage.trim().toLowerCase() : "";
  if (!targetLanguage) {
    return NextResponse.json({ error: "Target language is required." }, { status: 400 });
  }

  const message = await db.workOrderMessage.findUnique({
    where: { id },
    select: { id: true, body: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const existing = await db.messageTranslation.findUnique({
    where: {
      workOrderMessageId_targetLanguage: {
        workOrderMessageId: id,
        targetLanguage,
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      translatedBody: existing.translatedBody,
      targetLanguage,
      cached: true,
    });
  }

  try {
    const translatedBody = await translateText(message.body, targetLanguage);
    await db.messageTranslation.create({
      data: {
        workOrderMessageId: id,
        targetLanguage,
        translatedBody,
        provider: "google-translate-public",
        createdByUserId: session.id,
      },
    });

    return NextResponse.json({ translatedBody, targetLanguage, cached: false });
  } catch (error) {
    console.error("Message translation failed:", error);
    return NextResponse.json({ error: "Unable to translate this message right now." }, { status: 502 });
  }
}
