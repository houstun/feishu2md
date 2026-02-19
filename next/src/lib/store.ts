import { Redis } from "@upstash/redis";
import { randomBytes } from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface SavedDocument {
  id: string;
  title: string;
  markdown: string;
  createdAt: string;
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function saveDocument(
  title: string,
  markdown: string
): Promise<string> {
  const id = randomBytes(4).toString("hex");
  const doc: SavedDocument = {
    id,
    title,
    markdown,
    createdAt: new Date().toISOString(),
  };
  await redis.set(`doc:${id}`, JSON.stringify(doc), { ex: TTL_SECONDS });
  return id;
}

export async function getDocument(
  id: string
): Promise<SavedDocument | null> {
  const data = await redis.get<string>(`doc:${id}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}
