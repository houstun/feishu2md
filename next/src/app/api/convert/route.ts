import { NextRequest, NextResponse } from "next/server";
import { validateDocumentURL } from "@/lib/url-utils";
import { getDocxContent, getWikiNodeInfo, downloadImage } from "@/lib/feishu-client";
import { Parser } from "@/lib/parser";
import { isOSSConfigured, uploadImage } from "@/lib/oss";

export const maxDuration = 60;

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

    // Replace image tokens with URLs
    console.log("[OSS Debug] isOSSConfigured:", isOSSConfigured());
    console.log("[OSS Debug] ALI_OSS_REGION:", process.env.ALI_OSS_REGION ?? "(not set)");
    console.log("[OSS Debug] ALI_OSS_BUCKET:", process.env.ALI_OSS_BUCKET ?? "(not set)");
    console.log("[OSS Debug] ALI_OSS_ACCESS_KEY_ID:", process.env.ALI_OSS_ACCESS_KEY_ID ? "set" : "(not set)");
    console.log("[OSS Debug] ALI_OSS_ACCESS_KEY_SECRET:", process.env.ALI_OSS_ACCESS_KEY_SECRET ? "set" : "(not set)");
    console.log("[OSS Debug] imageTokens count:", parser.imageTokens.length);
    if (isOSSConfigured() && parser.imageTokens.length > 0) {
      const results = await Promise.all(
        parser.imageTokens.map(async (imgToken) => {
          try {
            const buffer = await downloadImage(imgToken);
            const ossUrl = await uploadImage(imgToken, buffer);
            return { imgToken, url: ossUrl };
          } catch (err) {
            console.error(`Failed to upload image ${imgToken} to OSS:`, err);
            return { imgToken, url: `/api/image/${imgToken}` };
          }
        })
      );
      for (const { imgToken, url: imageUrl } of results) {
        markdown = markdown.replace(imgToken, imageUrl);
      }
    } else {
      for (const imgToken of parser.imageTokens) {
        markdown = markdown.replace(imgToken, `/api/image/${imgToken}`);
      }
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
