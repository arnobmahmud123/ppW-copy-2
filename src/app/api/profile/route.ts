import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      role: true,
      phone: true,
      company: true,
      address: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getAppSession();
  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const company = typeof payload.company === "string" ? payload.company.trim() : "";
  const address = typeof payload.address === "string" ? payload.address.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.id },
    data: {
      name,
      phone: phone || null,
      company: company || null,
      address: address || null,
    },
    select: {
      name: true,
      email: true,
      role: true,
      phone: true,
      company: true,
      address: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ success: true, user });
}
