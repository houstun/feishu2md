import { NextRequest, NextResponse } from "next/server";
import { downloadImage } from "@/lib/feishu-client";

function detectContentType(buffer: Buffer): string {
  if (buffer.length < 4) return "application/octet-stream";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  )
    return "image/webp";
  return "application/octet-stream";
}

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new NextResponse("Missing image token", { status: 400 });
  }

  try {
    const data = await downloadImage(token);
    const contentType = detectContentType(data);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Failed to download image", { status: 500 });
  }
}
