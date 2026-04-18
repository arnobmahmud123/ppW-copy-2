import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { getSecurityPosture } from "@/lib/security";

export async function GET() {
  const session = await getAppSession();
  if (!session?.id || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(getSecurityPosture());
}
