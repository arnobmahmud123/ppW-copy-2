import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await getAppSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "")}`;
    const filePath = path.join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    // Provide the URL
    const mediaAssetId = `/uploads/${fileName}`;

    return NextResponse.json({ success: true, mediaAssetId });
  } catch (error: any) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Failed to upload" }, { status: 500 });
  }
}
