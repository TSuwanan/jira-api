"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    full_name: zod_1.z.string().min(2, "Full name must be at least 2 characters"),
    role_id: zod_1.z.number().int().min(1).max(2).optional().default(2),
    position_code: zod_1.z.enum(["DEV", "QA", "PM"]).optional(),
    level_code: zod_1.z.enum(["S", "M", "J", "L"]).optional(),
});
