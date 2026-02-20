import * as lark from "@larksuiteoapi/node-sdk";
import type { DocxBlock, DocxDocument } from "./types";

let client: lark.Client | null = null;

function getClient(): lark.Client {
  if (!client) {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET environment variables");
    }
    client = new lark.Client({
      appId,
      appSecret,
      appType: lark.AppType.SelfBuild,
      domain: lark.Domain.Feishu,
    });
  }
  return client;
}

export async function getDocxContent(docToken: string): Promise<{
  document: DocxDocument;
  blocks: DocxBlock[];
}> {
  const c = getClient();

  const docResp = await c.docx.document.get({
    path: { document_id: docToken },
  });

  if (docResp.code !== 0) {
    throw new Error(`Failed to get document: ${docResp.msg}`);
  }

  const doc = docResp.data?.document;
  if (!doc) {
    throw new Error("Document not found");
  }

  const blocks: DocxBlock[] = [];
  let pageToken: string | undefined;

  do {
    const blockResp = await c.docx.documentBlock.list({
      path: { document_id: docToken },
      params: {
        page_size: 500,
        ...(pageToken ? { page_token: pageToken } : {}),
      },
    });

    if (blockResp.code !== 0) {
      throw new Error(`Failed to get blocks: ${blockResp.msg}`);
    }

    const items = blockResp.data?.items;
    if (items) {
      blocks.push(...(items as unknown as DocxBlock[]));
    }

    pageToken = blockResp.data?.has_more
      ? blockResp.data?.page_token ?? undefined
      : undefined;
  } while (pageToken);

  return {
    document: doc as unknown as DocxDocument,
    blocks,
  };
}

export async function getWikiNodeInfo(
  token: string
): Promise<{ obj_type: string; obj_token: string }> {
  const c = getClient();

  const resp = await c.wiki.space.getNode({
    params: { token },
  });

  if (resp.code !== 0) {
    throw new Error(`Failed to get wiki node: ${resp.msg}`);
  }

  const node = resp.data?.node;
  if (!node) {
    throw new Error("Wiki node not found");
  }

  return {
    obj_type: node.obj_type as string,
    obj_token: node.obj_token as string,
  };
}

export async function downloadImage(imgToken: string): Promise<Buffer> {
  const c = getClient();

  const resp = await c.drive.media.download({
    path: { file_token: imgToken },
  });

  if (Buffer.isBuffer(resp)) {
    return resp;
  }

  if (resp instanceof Uint8Array || resp instanceof ArrayBuffer) {
    return Buffer.from(resp);
  }

  // The SDK may return a Node.js Readable stream
  const { Readable } = await import("stream");
  if (resp instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of resp) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // Fallback: try to consume as ReadableStream (Web API)
  const stream = resp as unknown as ReadableStream<Uint8Array>;
  if (typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }

  throw new Error(`Unexpected response type from media.download: ${typeof resp}`);
}
