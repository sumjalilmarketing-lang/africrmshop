import { z } from "zod";

export const ownerBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  activityTypeCode: z.string().trim().min(2).max(50),
  planCode: z.string().trim().min(2).max(50),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  storeName: z.string().trim().min(2).max(120),
  storeCode: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/),
  city: z.string().trim().min(2).max(80),
});

export type OwnerBusinessInput = z.infer<typeof ownerBusinessSchema>;
