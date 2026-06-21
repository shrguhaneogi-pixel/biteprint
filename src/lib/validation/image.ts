import sharp from "sharp";

export const MAX_DIMENSION_PX = 4096;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Magic byte signatures for supported image formats
const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF header; verified further below
} as const;

export type ValidateImageResult =
  | { valid: true; mimeType: "image/jpeg" | "image/png" | "image/webp" }
  | { valid: false; reason: string };

/**
 * Check if buffer starts with expected magic bytes.
 */
function hasMagicBytes(buffer: Buffer, magic: readonly number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

/**
 * Detect image format via magic bytes.
 * Returns null if format is unrecognized or unsupported.
 */
function detectFormat(
  buffer: Buffer
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (hasMagicBytes(buffer, MAGIC_BYTES.jpeg)) return "image/jpeg";
  if (hasMagicBytes(buffer, MAGIC_BYTES.png)) return "image/png";

  // WebP: RIFF header at 0 + "WEBP" at offset 8
  if (
    hasMagicBytes(buffer, MAGIC_BYTES.webp) &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50   // P
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Server-side image validation using Sharp.
 *
 * Steps:
 * 1. Size check (before any parsing)
 * 2. Magic byte check (format sniffing — prevents polyglot attacks)
 * 3. Sharp metadata extraction (validates decodability)
 * 4. Dimension check (prevents zip-bomb style images)
 * 5. EXIF is automatically stripped by Sharp during any processing
 *
 * The buffer is NEVER written to disk.
 */
export async function validateImageBuffer(
  buffer: Buffer
): Promise<ValidateImageResult> {
  // 1. Size check — first line of defence, before any parsing
  if (buffer.length === 0) {
    return { valid: false, reason: "Image buffer is empty" };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `Image exceeds 5 MB limit (received ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`,
    };
  }

  // 2. Magic byte detection — reject before Sharp processes
  const detectedMimeType = detectFormat(buffer);
  if (!detectedMimeType) {
    return {
      valid: false,
      reason: "Invalid image format. Magic bytes do not match JPEG, PNG, or WebP.",
    };
  }

  // 3. Sharp metadata extraction — validates actual decodability
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return {
      valid: false,
      reason: "Image could not be decoded. File may be corrupt.",
    };
  }

  // 4. Dimension check
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width === 0 || height === 0) {
    return { valid: false, reason: "Image has invalid dimensions (0×0)" };
  }

  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    return {
      valid: false,
      reason: `Image dimensions (${width}×${height}) exceed maximum of ${MAX_DIMENSION_PX}×${MAX_DIMENSION_PX}`,
    };
  }

  return { valid: true, mimeType: detectedMimeType };
}
