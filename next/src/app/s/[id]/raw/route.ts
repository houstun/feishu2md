import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDocument(id);

  if (!doc) {
    return new NextResponse("Document not found", { status: 404 });
  }

  return new NextResponse(doc.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
