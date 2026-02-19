import { NextRequest, NextResponse } from "next/server";
import { saveDocument } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const { title, markdown } = await request.json();

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { error: "Markdown content is required" },
        { status: 400 }
      );
    }

    const id = await saveDocument(title || "Untitled", markdown);

    return NextResponse.json({
      id,
      url: `/s/${id}`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to save document";
    console.error("Share error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
