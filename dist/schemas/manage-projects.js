"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Project name must be at least 3 characters").max(255),
    description: zod_1.z.string().optional(),
    member_ids: zod_1.z.array(zod_1.z.string().uuid("Invalid member ID")).optional(), // Array of user IDs to add as project members
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, "Project name must be at least 3 characters").max(255).optional(),
    description: zod_1.z.string().optional(),
    owner_id: zod_1.z.string().uuid("Invalid owner ID").optional(),
    member_ids: zod_1.z.array(zod_1.z.string().uuid("Invalid member ID")).optional(),
});
