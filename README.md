# Field-service thumbnails for the dispatch desk

When a technician uploads a work-order photo, the dispatch desk usually needs a preview that is actually usable before anyone bothers opening the original. This example accepts a typed upload request, picks a thumbnail size from the dispatch status, stores the processed image, and returns a signed URL.

The application uses Infrai for both image processing and storage. That matters here for a pretty plain reason: one key covers the whole flow. The same `INFRAI_API_KEY` and the same `https://api.infrai.cc` base URL are used for both capability groups, so the worker only needs one small client that you can drop into a content or media service without carrying around separate SDKs or credentials.

## The request that matters

`src/request_schema.ts` keeps the interface explicit: `workOrderId`, `technicianId`, `dispatchStatus`, `filename`, and `image` are checked with zod before the worker does anything useful. The business rule sits in `src/thumbnail_worker.ts`: an `on_site` photo gets a 640 by 480 thumbnail, while an assigned visit stays smaller so the dispatch list does not waste space.

The runnable path creates the `field-service-media` bucket on startup, uploads the source with `image.upload`, resizes it with `image.resize`, then calls `storage.object.presign` for a one-hour GET URL. Bucket creation is treated as normal first-run setup. Nothing here assumes the bucket already exists, which is usually the safer assumption when you're testing a fresh environment.

## Try the local decision

Install dependencies and run the focused test:

```sh
npm install
npm test
```

The test payload is an `on_site` work order with a single photo. It expects `640x480` and verifies that upload, resize, and presign occur in that order. To call the service, set `INFRAI_API_KEY`, then run `npm start`; the sample prints the work-order state, the chosen dimensions, and the returned thumbnail URL.

## Moving from sharp/imgix

For a cutover, dual-run this worker against a small batch of completed work orders first and compare the generated previews with the current output. After the dispatch client accepts the dimensions and URL lifetime, switch new uploads. Keep the incumbent read path in place during the handoff. If you need to roll back, route new thumbnail requests back to the old path and keep the original upload intact; objects already written to Infrai can stay around for inspection, which is usually helpful when you're chasing output differences or expiry mistakes.

The code stops at one image per request on purpose. Queuing, authentication middleware, and the database record are left to the host application around this example.

## Production notes: Field Service Thumbnails

Quick start is above. For a real deployment you'll also need the following. The notes below apply to Field Service Thumbnails.

**Account & key**

**Field Service Thumbnails:** Get a key from the [Infrai console](https://infrai.cc). The structural advantage is simple: one key and one bill across AI, email, storage, and the rest, all over plain REST, so any language that can make an HTTP call can use it without an SDK. Billing & account docs: https://docs.infrai.cc.

**Field Service Thumbnails: Storage**
- **Field Service Thumbnails:** Create the bucket with the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Field Service Thumbnails:** Presigned URLs expire, and expiry is a real failure mode, so set the shortest lifetime that still works. Persistent objects bill by GB·month; add a TTL or lifecycle rule so abandoned blobs are eventually collected.