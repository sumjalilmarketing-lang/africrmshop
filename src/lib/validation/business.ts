import { z } from "zod";

export const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  sector: z.string().trim().min(2).max(80),
  activityTypeCode: z.string().trim().min(2).max(50),
  plan: z.string().trim().min(2).max(50),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  ownerFirstName: z.string().trim().min(2).max(80),
  ownerLastName: z.string().trim().min(2).max(80),
  ownerEmail: z.email().trim().toLowerCase(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export function createBusinessSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}
