import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(255),
  description: z.string().optional(),
  member_ids: z.array(z.string().uuid("Invalid member ID")).optional(), // Array of user IDs to add as project members
});

export const updateProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").max(255).optional(),
  description: z.string().optional(),
  owner_id: z.string().uuid("Invalid owner ID").optional(),
  member_ids: z.array(z.string().uuid("Invalid member ID")).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
