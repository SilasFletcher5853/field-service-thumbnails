import { z } from "zod";

export const thumbnailRequest = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  dispatchStatus: z.enum(["assigned", "en_route", "on_site", "complete"]),
  filename: z.string().min(1),
  image: z.string().min(1)
});

export type ThumbnailRequest = z.infer<typeof thumbnailRequest>;
