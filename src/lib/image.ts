"use client";

export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024;

/**
 * Centre-crops an image to a square and resizes it in the browser, so
 * uploads are small (~20–40 KB) regardless of the original photo size.
 */
export async function toSquareJpeg(file: File, size = 256, quality = 0.86): Promise<Blob> {
  if (!AVATAR_TYPES.includes(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
  if (file.size > AVATAR_MAX_INPUT_BYTES) throw new Error("That image is larger than 8 MB. Please choose a smaller one.");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  // Bias portrait photos slightly upwards so faces stay in frame.
  const sy = bitmap.height > bitmap.width ? Math.max(0, (bitmap.height - side) * 0.25) : (bitmap.height - side) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Your browser could not process the image.");
  return blob;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
