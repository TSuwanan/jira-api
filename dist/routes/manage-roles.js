"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleRoutes = void 0;
const elysia_1 = require("elysia");
const manage_roles_1 = require("../controllers/manage-roles");
const auth_1 = require("../middleware/auth");
exports.roleRoutes = new elysia_1.Elysia({ prefix: "/api/roles" })
    .use(auth_1.jwtPlugin)
    .guard({}, (app) => app
    .use((app) => (0, auth_1.authMiddleware)(app))
    // GET /api/roles - Get all roles
    .get("/", async ({ set }) => {
    try {
        const roles = await manage_roles_1.RoleController.getRoles();
        return {
            data: roles,
            message: "Roles retrieved successfully",
            status: 200
        };
    }
    catch (error) {
        set.status = 500;
        return { error: error.message };
    }
}));
