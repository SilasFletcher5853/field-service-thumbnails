import { InfraiClient } from "./infrai_client.ts";
import { thumbnailRequest, type ThumbnailRequest } from "./request_schema.ts";

const sizes = { assigned: [320, 240], en_route: [480, 360], on_site: [640, 480], complete: [800, 600] } as const;
const defaultBucket = "field-service-media";

export async function createWorkOrderThumbnail(input: unknown, client: InfraiClient, bucket = defaultBucket) {
  const request = thumbnailRequest.parse(input);
  const [width, height] = sizes[request.dispatchStatus];
  const uploaded = await client.upload(request.image, request.filename);
  const resized = await client.resize(uploaded.id, width, height);
  const signed = await client.presign(bucket, `${request.workOrderId}/${request.technicianId}/${resized.id}.webp`);
  return { workOrderId: request.workOrderId, dispatchStatus: request.dispatchStatus, width, height, thumbnailUrl: signed.url };
}

async function main() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the worker");
  const client = new InfraiClient(key);
  const bucket = process.env.INFRAI_BUCKET ?? defaultBucket;
  await client.ensureBucket(bucket);
  const result = await createWorkOrderThumbnail({
    workOrderId: "WO-1042", technicianId: "tech-17", dispatchStatus: "on_site",
    filename: "compressor-room.png", image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  }, client, bucket);
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.main) void main();
