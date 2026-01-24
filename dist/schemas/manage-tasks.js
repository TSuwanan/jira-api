"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeTaskSchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    project_id: zod_1.z.string().uuid("Invalid project ID"),
    title: zod_1.z.string().min(3, "Title must be at least 3 characters").max(255),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(["T", "I", "D"]).default("T"),
    priority: zod_1.z.enum(["L", "M", "H"]).optional().nullable(),
    assignee_id: zod_1.z.preprocess((val) => val === "" ? undefined : val, zod_1.z.string().uuid("Invalid assignee ID").optional().nullable()),
    due_date: zod_1.z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
});
exports.updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, "Title must be at least 3 characters").max(255).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(["T", "I", "D"]).optional(),
    priority: zod_1.z.enum(["L", "M", "H"]).optional().nullable(),
    assignee_id: zod_1.z.preprocess((val) => val === "" ? undefined : val, zod_1.z.string().uuid("Invalid assignee ID").optional().nullable()),
    due_date: zod_1.z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid date format",
    }),
});
exports.completeTaskSchema = zod_1.z.object({
    comment: zod_1.z.string().min(1, "Comment is required").max(1000),
});
