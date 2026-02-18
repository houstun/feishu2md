import { NextRequest, NextResponse } from "next/server";
import { validateDocumentURL } from "@/lib/url-utils";
import { getDocxContent, getWikiNodeInfo } from "@/lib/feishu-client";
import { Parser } from "@/lib/parser";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid URL" },
        { status: 400 }
      );
    }

    let { docType, docToken } = validateDocumentURL(url);

    if (docType === "wiki") {
      const node = await getWikiNodeInfo(docToken);
      docType = node.obj_type;
      docToken = node.obj_token;
    }

    if (docType === "docs") {
      return NextResponse.json(
        { error: "Legacy 'docs' format is not supported, only 'docx' is supported" },
        { status: 400 }
      );
    }

    const { document, blocks } = await getDocxContent(docToken);

    const parser = new Parser();
    let markdown = parser.parseDocxContent(document, blocks);

    // Replace image tokens with proxy URLs
    for (const imgToken of parser.imageTokens) {
      markdown = markdown.replace(imgToken, `/api/image/${imgToken}`);
    }

    return NextResponse.json({
      title: document.title,
      markdown,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Conversion failed";
    console.error("Convert error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
