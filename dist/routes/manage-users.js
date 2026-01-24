"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const elysia_1 = require("elysia");
const zod_1 = require("zod");
const manage_users_1 = require("../controllers/manage-users");
const manage_users_2 = require("../schemas/manage-users");
const auth_1 = require("../middleware/auth");
exports.userRoutes = new elysia_1.Elysia({ prefix: "/api/users" })
    .use(auth_1.jwtPlugin)
    .guard({}, (app) => app
    .use((app) => (0, auth_1.authMiddleware)(app))
    // GET /api/users - Get all users (admin only)
    .get("/", async ({ user, set, query }) => {
    try {
        const page = parseInt(query.page) || 1;
        const search = query.search;
        const result = await manage_users_1.UserController.getUsers(user, page, search);
        return {
            ...result,
            message: "Users retrieved successfully",
            status: 200
        };
    }
    catch (error) {
        if (error.message === "Unauthorized: Only admin can view users") {
            set.status = 403;
            return { error: error.message };
        }
        set.status = 500;
        return { error: error.message };
    }
})
    // GET /api/users/members - Get all members (role_id = 2)
    .get("/members", async ({ user, set }) => {
    try {
        const result = await manage_users_1.UserController.getMembers(user);
        return { data: result, message: "Members retrieved successfully", status: 200 };
    }
    catch (error) {
        if (error.message === "Unauthorized: Only admin can view members") {
            set.status = 403;
            return { error: error.message };
        }
        set.status = 500;
        return { error: error.message };
    }
})
    // POST /api/users - Add new user (admin only)
    .post("/", async ({ body, user, set }) => {
    try {
        const validatedData = manage_users_2.createUserSchema.parse(body);
        const newUser = await manage_users_1.UserController.addUser(validatedData, user);
        set.status = 201;
        return { data: newUser, message: "User created successfully", status: 201 };
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            set.status = 400;
            return {
                error: "Validation failed",
                details: error.issues.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            };
        }
        if (error.message === "Unauthorized: Only admin can add users") {
            set.status = 403;
            return { error: error.message };
        }
        set.status = error.message === "Email already exists" ? 400 : 500;
        return { error: error.message };
    }
})
    .delete("/:id", async ({ params, user, set }) => {
    try {
        const result = await manage_users_1.UserController.deleteUser(params.id, user);
        return { data: result, message: "User deleted successfully", status: 200 };
    }
    catch (error) {
        if (error.message === "Unauthorized: Only admin can delete users") {
            set.status = 403;
            return { error: error.message };
        }
        if (error.message === "User not found") {
            set.status = 404;
            return { error: error.message };
        }
        if (error.message === "Cannot delete yourself") {
            set.status = 400;
            return { error: error.message };
        }
        set.status = 500;
        return { error: error.message };
    }
}));
