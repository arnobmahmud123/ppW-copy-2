import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/advanced-search?q=term
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  // Simple case‑insensitive contains search across messages, attachments, users
  const [messages, attachments, users] = await Promise.all([
    db.message.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 20,
      select: { id: true, content: true, createdAt: true, authorId: true },
    }),
    db.messageAttachment.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 20,
      select: { id: true, name: true, url: true, messageId: true },
    }),
    db.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, name: true, email: true, avatarUrl: true },
    }),
  ]);

  return NextResponse.json({ messages, attachments, users });
}
