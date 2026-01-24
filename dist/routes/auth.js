"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const elysia_1 = require("elysia");
const zod_1 = require("zod");
const auth_1 = require("../controllers/auth");
const auth_2 = require("../schemas/auth");
const auth_3 = require("../middleware/auth");
exports.authRoutes = new elysia_1.Elysia({ prefix: "/api/auth" })
    .use(auth_3.jwtPlugin)
    // Login
    .post("/login", async ({ body, jwt, set }) => {
    try {
        // Validate with Zod
        const validatedData = auth_2.loginSchema.parse(body);
        const user = await auth_1.AuthController.login(validatedData);
        // Generate JWT
        const token = await jwt.sign({
            id: user.id,
            email: user.email,
            role_id: user.role_id,
        });
        return { user, token };
    }
    catch (error) {
        // Zod validation errors
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
        // Other errors
        set.status = error.message === "Invalid credentials" ? 401 : 500;
        return { error: error.message };
    }
})
    // Get current user (protected route)
    .guard({}, (app) => app
    .use((app) => (0, auth_3.authMiddleware)(app))
    .get("/me", async ({ user, set }) => {
    try {
        const currentUser = await auth_1.AuthController.getCurrentUser(user.id);
        return { user: currentUser };
    }
    catch (error) {
        set.status = error.message === "User not found" ? 404 : 500;
        return { error: error.message };
    }
}));
