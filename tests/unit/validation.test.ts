import { describe, it, expect } from "vitest";
import { validateImageBuffer, MAX_DIMENSION_PX } from "@/lib/validation/image";

// ============================================================
// Magic byte helpers
// ============================================================

function makeJpegBuffer(size = 100): Buffer {
  const buf = Buffer.alloc(size, 0);
  buf[0] = 0xff;
  buf[1] = 0xd8;
  buf[2] = 0xff;
  return buf;
}

function makePngBuffer(size = 100): Buffer {
  const buf = Buffer.alloc(size, 0);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf[4] = 0x0d;
  buf[5] = 0x0a;
  buf[6] = 0x1a;
  buf[7] = 0x0a;
  return buf;
}

function makeWebpBuffer(size = 100): Buffer {
  const buf = Buffer.alloc(size, 0);
  // RIFF header
  buf[0] = 0x52; // R
  buf[1] = 0x49; // I
  buf[2] = 0x46; // F
  buf[3] = 0x46; // F
  // File size (4 bytes) — can be 0 for test
  // WEBP signature at offset 8
  buf[8] = 0x57;  // W
  buf[9] = 0x45;  // E
  buf[10] = 0x42; // B
  buf[11] = 0x50; // P
  return buf;
}

// ============================================================
// Tests
// ============================================================

describe("validateImageBuffer — size checks", () => {
  it("rejects an empty buffer", async () => {
    const result = await validateImageBuffer(Buffer.alloc(0));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("empty");
    }
  });

  it("rejects buffers exceeding 5 MB", async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    const result = await validateImageBuffer(oversized);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("5 MB");
    }
  });
});

describe("validateImageBuffer — magic byte detection", () => {
  it("detects JPEG magic bytes (FF D8 FF)", async () => {
    // Note: Sharp will fail to fully decode a fake buffer, but we test magic bytes
    const buf = makeJpegBuffer();
    const result = await validateImageBuffer(buf);
    // Either Sharp decodes it or fails after magic byte check
    // We just verify it doesn't fail on the magic byte step
    if (!result.valid) {
      expect(result.reason).not.toContain("Magic bytes");
    }
  });

  it("rejects a buffer with no recognizable magic bytes", async () => {
    const random = Buffer.alloc(100, 0x42); // All 'B' bytes
    const result = await validateImageBuffer(random);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason.toLowerCase()).toMatch(/magic|format|invalid/);
    }
  });

  it("rejects a plain text file with wrong MIME", async () => {
    const textBuf = Buffer.from("Hello, I am not an image");
    const result = await validateImageBuffer(textBuf);
    expect(result.valid).toBe(false);
  });

  it("rejects a zip file disguised as an image", async () => {
    // ZIP magic bytes: 50 4B 03 04
    const zipBuf = Buffer.alloc(100, 0x00);
    zipBuf[0] = 0x50;
    zipBuf[1] = 0x4b;
    zipBuf[2] = 0x03;
    zipBuf[3] = 0x04;
    const result = await validateImageBuffer(zipBuf);
    expect(result.valid).toBe(false);
  });
});

describe("validateImageBuffer — WebP detection", () => {
  it("identifies WebP magic bytes correctly", async () => {
    const webpBuf = makeWebpBuffer(200);
    const result = await validateImageBuffer(webpBuf);
    // Will fail Sharp decode but should pass magic byte check
    if (!result.valid) {
      expect(result.reason).not.toContain("Magic bytes");
    }
  });
});
