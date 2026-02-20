import OSS from "ali-oss";

let client: OSS | null = null;

export function isOSSConfigured(): boolean {
  return !!(
    process.env.ALI_OSS_REGION &&
    process.env.ALI_OSS_ACCESS_KEY_ID &&
    process.env.ALI_OSS_ACCESS_KEY_SECRET &&
    process.env.ALI_OSS_BUCKET
  );
}

function getClient(): OSS {
  if (!client) {
    const region = process.env.ALI_OSS_REGION;
    const accessKeyId = process.env.ALI_OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALI_OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.ALI_OSS_BUCKET;

    if (!region || !accessKeyId || !accessKeySecret || !bucket) {
      throw new Error(
        "Missing ALI_OSS_REGION, ALI_OSS_ACCESS_KEY_ID, ALI_OSS_ACCESS_KEY_SECRET, or ALI_OSS_BUCKET"
      );
    }

    client = new OSS({ region, accessKeyId, accessKeySecret, bucket });
  }
  return client;
}

function detectExtension(buffer: Buffer): string {
  if (buffer.length < 4) return "bin";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "gif";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  )
    return "webp";
  return "bin";
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bin: "application/octet-stream",
};

export async function uploadImage(
  token: string,
  buffer: Buffer
): Promise<string> {
  const ossClient = getClient();
  const ext = detectExtension(buffer);
  const objectKey = `feishu-images/${token}.${ext}`;

  await ossClient.put(objectKey, buffer, {
    headers: {
      "Content-Type": CONTENT_TYPE_MAP[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });

  const customDomain = process.env.ALI_OSS_CUSTOM_DOMAIN;
  if (customDomain) {
    return `${customDomain.replace(/\/+$/, "")}/${objectKey}`;
  }

  const bucket = process.env.ALI_OSS_BUCKET;
  const region = process.env.ALI_OSS_REGION;
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`;
}
