import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { createChannelImageDataUrl, validateChannelImageFile } from "@/lib/channel-image";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No avatar file provided" }, { status: 400 });
    }

    const validationError = validateChannelImageFile(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const avatarUrl = await createChannelImageDataUrl(file);

    await db.user.update({
      where: { id: session.id },
      data: { avatarUrl }
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    await db.user.update({
      where: { id: session.id },
      data: { avatarUrl: null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar remove error:", error);
    return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
  }
}
