import { z } from "zod";

export const createTaskSchema = z.object({
  project_id: z.string().uuid("Invalid project ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().optional(),
  status: z.enum(["T", "I", "D"]).default("T"),
  priority: z.enum(["L", "M", "H"]).optional().nullable(),
  assignee_id: z.preprocess((val) => val === "" ? undefined : val, z.string().uuid("Invalid assignee ID").optional().nullable()),
  due_date: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255).optional(),
  description: z.string().optional(),
  status: z.enum(["T", "I", "D"]).optional(),
  priority: z.enum(["L", "M", "H"]).optional().nullable(),
  assignee_id: z.preprocess((val) => val === "" ? undefined : val, z.string().uuid("Invalid assignee ID").optional().nullable()),
  due_date: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

export const completeTaskSchema = z.object({
  comment: z.string().min(1, "Comment is required").max(1000),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
