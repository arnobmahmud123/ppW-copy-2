import { NextRequest, NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { canAccessMessage, getMessagingAccessContext } from "@/modules/messaging/permissions";

async function translateWithPublicGoogle(text: string, targetLanguage: string) {
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

async function translateWithGemini(text: string, targetLanguage: string) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) {
    throw new Error("Gemini API key unavailable");
  }

  const model =
    process.env.GEMINI_TRANSLATE_MODEL ||
    process.env.GEMINI_CHAT_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.1,
        },
        contents: [
          {
            parts: [
              {
                text: [
                  "Translate the message below into the requested language.",
                  `Target language code: ${targetLanguage}`,
                  "Return only the translated text.",
                  "Do not add explanations, notes, labels, or quotation marks.",
                  "",
                  text,
                ].join("\n"),
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Gemini translation provider unavailable");
  }

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      }
    | null;

  const translated = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
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
    let translatedBody = "";
    let provider = "google-translate-public";

    try {
      translatedBody = await translateWithGemini(message.body, targetLanguage);
      provider = "gemini";
    } catch (geminiError) {
      console.warn("Gemini translation fallback triggered:", geminiError);
      translatedBody = await translateWithPublicGoogle(message.body, targetLanguage);
    }

    await db.messageTranslation.create({
      data: {
        workOrderMessageId: id,
        targetLanguage,
        translatedBody,
        provider,
        createdByUserId: session.id,
      },
    });

    return NextResponse.json({ translatedBody, targetLanguage, cached: false });
  } catch (error) {
    console.error("Message translation failed:", error);
    return NextResponse.json({ error: "Unable to translate this message right now." }, { status: 502 });
  }
}
