const ALLOWED_CHANNEL_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

export const MAX_CHANNEL_IMAGE_BYTES = 2 * 1024 * 1024;

export function validateChannelImageFile(file: File) {
  if (!ALLOWED_CHANNEL_IMAGE_TYPES.has(file.type)) {
    return "Use a JPG, PNG, WEBP, GIF, SVG, or AVIF image.";
  }

  if (file.size > MAX_CHANNEL_IMAGE_BYTES) {
    return "Use an image smaller than 2 MB.";
  }

  return null;
}

export async function createChannelImageDataUrl(file: File) {
  const mimeType = file.type || "image/jpeg";
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
