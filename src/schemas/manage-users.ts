import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  role_id: z.number().int().min(1).max(2).optional().default(2),
  position_code: z.enum(["DEV", "QA", "PM"]).optional(),
  level_code: z.enum(["S", "M", "J", "L"]).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
