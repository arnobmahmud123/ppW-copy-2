import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChannelImageDataUrl, validateChannelImageFile } from "@/lib/channel-image";
import { prisma } from "@/lib/db";

async function canEditUser(targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { allowed: false, status: 401 };
  }

  const isSelf = session.user.id === targetUserId;
  const isAdmin = session.user.role === "ADMIN";
  return { allowed: isSelf || isAdmin, status: isSelf || isAdmin ? 200 : 403 };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permission = await canEditUser(id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.status === 401 ? "Unauthorized" : "Forbidden" }, { status: permission.status });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No avatar file provided" }, { status: 400 });
  }

  const validationError = validateChannelImageFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const avatarUrl = await createChannelImageDataUrl(file);
  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ success: true, user });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permission = await canEditUser(id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.status === 401 ? "Unauthorized" : "Forbidden" }, { status: permission.status });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { avatarUrl: null },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ success: true, user });
}
