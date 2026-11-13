import test from "node:test";
import assert from "node:assert/strict";
import { createWorkOrderThumbnail } from "./thumbnail_worker.ts";

test("on-site photos receive the medium field-service thumbnail", async () => {
  const calls: string[] = [];
  const client = {
    upload: async () => { calls.push("upload"); return { id: "source-1" }; },
    resize: async (_image: string, width: number, height: number) => { calls.push(`resize:${width}x${height}`); return { id: "thumb-1" }; },
    presign: async () => { calls.push("presign"); return { url: "https://cdn.example/thumb-1" }; }
  } as never;
  const result = await createWorkOrderThumbnail({ workOrderId: "WO-1", technicianId: "T-1", dispatchStatus: "on_site", filename: "photo.jpg", image: "data" }, client);
  assert.equal(result.width, 640);
  assert.equal(result.height, 480);
  assert.deepEqual(calls, ["upload", "resize:640x480", "presign"]);
});
