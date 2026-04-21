export const runtime = "nodejs";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/app-session";
import { db } from "@/lib/db";
import { getMessagingAccessContext, canAccessMessageThread } from "@/modules/messaging";

type AttachmentRouteProps = {
  params: Promise<{ id: string }>;
};

type MessageAttachmentVersionRecord = {
  id: string;
  messageAttachmentId: string;
  versionNumber: number;
  fileName: string;
  storageKey: string;
  blobData?: Uint8Array | Buffer | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | string;
  createdByUserId: string | null;
};

function getMessageAttachmentVersionModel() {
  return (
    db as unknown as {
      messageAttachmentVersion?: {
        findFirst: (args: unknown) => Promise<MessageAttachmentVersionRecord | null>;
        findMany: (args: unknown) => Promise<MessageAttachmentVersionRecord[]>;
        count: (args: unknown) => Promise<number>;
        create: (args: unknown) => Promise<MessageAttachmentVersionRecord>;
      };
    }
  ).messageAttachmentVersion;
}

async function getAuthorizedAttachment(userId: string, id: string) {
  const context = await getMessagingAccessContext(userId);
  if (!context) {
    return { error: new NextResponse("Unauthorized", { status: 401 }) };
  }

  const attachment = await db.messageAttachment.findUnique({
    where: { id },
    include: {
      message: {
        select: {
          messageThreadId: true,
        },
      },
    },
  });

  if (!attachment) {
    return { error: new NextResponse("Not found", { status: 404 }) };
  }

  const allowed = await canAccessMessageThread(context, attachment.message.messageThreadId);
  if (!allowed) {
    return { error: new NextResponse("Forbidden", { status: 403 }) };
  }

  return { attachment };
}

function getLocalFilePath(storageKey: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  return path.join(process.cwd(), "public", storageKey.replace(/^\/+/, ""));
}

function getAttachmentBuffer(blobData: Uint8Array | Buffer | null | undefined) {
  if (!blobData) {
    return null;
  }

  return Buffer.isBuffer(blobData) ? blobData : Buffer.from(blobData);
}

function isImageAttachment(fileName: string, mimeType: string | null | undefined) {
  return Boolean(
    mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
  );
}

function isPdfAttachment(fileName: string, mimeType: string | null | undefined) {
  return mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
}

function isTextPreviewAttachment(fileName: string, mimeType: string | null | undefined) {
  return Boolean(
    mimeType?.startsWith("text/") ||
      [
        "application/json",
        "application/javascript",
        "application/typescript",
        "application/xml",
      ].includes(mimeType || "") ||
      /\.(txt|md|json|js|jsx|ts|tsx|css|scss|html|xml|yml|yaml|log|csv)$/i.test(fileName)
  );
}

export async function GET(request: Request, { params }: AttachmentRouteProps) {
  const session = await getAppSession();
  const { id } = await params;

  if (!session?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await getAuthorizedAttachment(session.id, id);
  if ("error" in result) {
    return result.error;
  }

  const { attachment } = result;
  const { searchParams } = new URL(request.url);
  const wantsPreview = searchParams.get("preview") === "1";
  const requestedVersionId = searchParams.get("version");
  const versionModel = getMessageAttachmentVersionModel();
  const selectedVersion =
    requestedVersionId && versionModel
      ? await versionModel.findFirst({
          where: {
            id: requestedVersionId,
            messageAttachmentId: attachment.id,
          },
        })
      : null;
  const targetFile = selectedVersion ?? attachment;
  const isImage = isImageAttachment(targetFile.fileName, targetFile.mimeType);
  const isPdf = isPdfAttachment(targetFile.fileName, targetFile.mimeType);
  const isTextPreview = isTextPreviewAttachment(targetFile.fileName, targetFile.mimeType);
  const localFilePath = getLocalFilePath(targetFile.storageKey);
  const inlineBuffer = getAttachmentBuffer(targetFile.blobData);

  if (inlineBuffer) {
    return new NextResponse(inlineBuffer, {
      status: 200,
      headers: {
        "Content-Type": targetFile.mimeType || "application/octet-stream",
        "Content-Disposition":
          wantsPreview && (isImage || isPdf || isTextPreview)
            ? "inline"
            : `attachment; filename="${targetFile.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (localFilePath) {
    try {
      const buffer = await readFile(localFilePath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": targetFile.mimeType || "application/octet-stream",
          "Content-Disposition":
            wantsPreview && (isImage || isPdf || isTextPreview)
              ? "inline"
              : `attachment; filename="${targetFile.fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      // fall through to generated preview/download fallback below
    }
  }

  if (wantsPreview && isImage) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6d14ff"/>
            <stop offset="55%" stop-color="#2d8cff"/>
            <stop offset="100%" stop-color="#ff4f8e"/>
          </linearGradient>
        </defs>
        <rect width="320" height="240" rx="24" fill="url(#bg)"/>
        <circle cx="72" cy="78" r="28" fill="rgba(255,255,255,0.22)"/>
        <path d="M42 188 L112 118 L162 166 L206 126 L278 188 Z" fill="rgba(255,255,255,0.28)"/>
        <rect x="28" y="172" width="264" height="38" rx="14" fill="rgba(255,255,255,0.92)"/>
        <text x="40" y="196" font-family="Arial, sans-serif" font-size="15" fill="#1e1b4b">${targetFile.fileName
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .slice(0, 28)}</text>
      </svg>
    `.trim();

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  }

  if (wantsPreview && isPdf) {
    return new NextResponse(
      `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 97 >>
stream
BT
/F1 18 Tf
72 720 Td
(Preview unavailable for ${attachment.fileName.replace(/[()\\]/g, "")}) Tj
0 -28 Td
/F1 12 Tf
(Use download if the original PDF is missing.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000388 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
458
%%EOF`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (wantsPreview && isTextPreview) {
    return new NextResponse(
      `Preview unavailable for ${targetFile.fileName}\n\nThe original text/code asset could not be found on disk.`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": "inline",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return new NextResponse(
    `Demo attachment download\n\nFile: ${targetFile.fileName}\nMime: ${targetFile.mimeType}\nSize: ${targetFile.sizeBytes} bytes\nStorage Key: ${targetFile.storageKey}\n`,
    {
      status: 200,
      headers: {
        "Content-Type": targetFile.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${targetFile.fileName}"`
      }
    }
  );
}

export async function PUT(request: Request, { params }: AttachmentRouteProps) {
  const session = await getAppSession();
  const { id } = await params;

  if (!session?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getAuthorizedAttachment(session.id, id);
  if ("error" in result) {
    return result.error;
  }

  const { attachment } = result;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", "messages");
  await mkdir(uploadDir, { recursive: true });

  const safeName = (file.name || attachment.fileName || `message-${attachment.id}.png`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = path.extname(safeName) || ".png";
  const nextFilename = `${attachment.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
  const nextStorageKey = `uploads/messages/${nextFilename}`;
  const nextFilePath = path.join(process.cwd(), "public", nextStorageKey);

  await writeFile(nextFilePath, bytes);

  const versionModel = getMessageAttachmentVersionModel();
  const updatedAttachment = await db.$transaction(async (tx) => {
    const txVersionModel = (
      tx as unknown as {
        messageAttachmentVersion?: {
          count: (args: unknown) => Promise<number>;
          create: (args: unknown) => Promise<MessageAttachmentVersionRecord>;
        };
      }
    ).messageAttachmentVersion;

    if (txVersionModel) {
      const existingVersionCount = await txVersionModel.count({
        where: { messageAttachmentId: attachment.id },
      });

      if (existingVersionCount === 0) {
        await txVersionModel.create({
          data: {
            messageAttachmentId: attachment.id,
            versionNumber: 1,
            fileName: attachment.fileName,
            storageKey: attachment.storageKey,
            blobData: attachment.blobData,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            createdByUserId: attachment.createdByUserId ?? session.id,
            createdAt: attachment.createdAt,
          },
        });
      }

      const currentCount = await txVersionModel.count({
        where: { messageAttachmentId: attachment.id },
      });

      await txVersionModel.create({
        data: {
          messageAttachmentId: attachment.id,
          versionNumber: currentCount + 1,
          fileName: file.name || attachment.fileName,
          storageKey: nextStorageKey,
          blobData: bytes,
          mimeType: file.type || attachment.mimeType || "application/octet-stream",
          sizeBytes: file.size,
          createdByUserId: session.id,
        },
      });
    }

    return tx.messageAttachment.update({
      where: { id: attachment.id },
      data: {
        fileName: file.name || attachment.fileName,
        mimeType: file.type || attachment.mimeType || "application/octet-stream",
        sizeBytes: file.size,
        storageKey: nextStorageKey,
        blobData: bytes,
      },
    });
  });

  const cacheBust = Date.now();
  const latestVersions =
    versionModel
      ? await versionModel.findMany({
          where: { messageAttachmentId: attachment.id },
          orderBy: { versionNumber: "desc" },
          take: 25,
        })
      : [];

  return NextResponse.json({
    success: true,
    attachment: {
      id: updatedAttachment.id,
      fileName: updatedAttachment.fileName,
      mimeType: updatedAttachment.mimeType,
      isImage: isImageAttachment(updatedAttachment.fileName, updatedAttachment.mimeType),
      previewUrl: `/messages/attachments/${updatedAttachment.id}?preview=1&v=${cacheBust}`,
      downloadHref: `/messages/attachments/${updatedAttachment.id}?v=${cacheBust}`,
    },
    versions: latestVersions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      fileName: version.fileName,
      mimeType: version.mimeType,
      sizeBytes: version.sizeBytes,
      createdAt: version.createdAt instanceof Date ? version.createdAt.toISOString() : version.createdAt,
      previewUrl: `/messages/attachments/${updatedAttachment.id}?preview=1&version=${version.id}&v=${cacheBust}`,
      downloadHref: `/messages/attachments/${updatedAttachment.id}?version=${version.id}&v=${cacheBust}`,
    })),
  });
}
