import { z } from "zod";

export const employeeInvitationSchema = z.object({
  businessId: z.uuid(),
  storeId: z.uuid(),
  roleCode: z.enum([
    "manager",
    "seller",
    "cashier",
    "accountant",
    "hairdresser",
    "technician",
    "receptionist",
  ]),
  email: z.email().trim().toLowerCase(),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  jobTitle: z.string().trim().max(100).optional().or(z.literal("")),
});

export type EmployeeInvitationInput = z.infer<typeof employeeInvitationSchema>;
