import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const channels = await db.messageThread.findMany({
    where: { threadType: "GENERAL" },
    select: { title: true, channelImageUrl: true }
  });
  return NextResponse.json(channels);
}
