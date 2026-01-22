import { Elysia } from "elysia";
import { ZodError } from "zod";
import { AuthController } from "../controllers/auth";
import { registerSchema, loginSchema } from "../schemas/auth";
import { jwtPlugin, authMiddleware } from "../middleware/auth";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtPlugin)

  // Register
  .post("/register", async ({ body, jwt, set }) => {
    try {
      // Validate with Zod
      const validatedData = registerSchema.parse(body);

      const user = await AuthController.register(validatedData);

      // Generate JWT
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      });

      set.status = 201;
      return { user, token };
    } catch (error: any) {
      // Zod validation errors
      if (error instanceof ZodError) {
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
      set.status = error.message === "Email already exists" ? 400 : 500;
      return { error: error.message };
    }
  })

  // Login
  .post("/login", async ({ body, jwt, set }) => {
    try {
      // Validate with Zod
      const validatedData = loginSchema.parse(body);

      const user = await AuthController.login(validatedData);

      // Generate JWT
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        role_id: user.role_id,
      });

      return { user, token };
    } catch (error: any) {
      // Zod validation errors
      if (error instanceof ZodError) {
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
  .guard({}, (app) =>
    app
      .use((app) => authMiddleware(app))
      .get("/me", async ({ user, set }) => {
        try {
          const currentUser = await AuthController.getCurrentUser(user.id);
          return { user: currentUser };
        } catch (error: any) {
          set.status = error.message === "User not found" ? 404 : 500;
          return { error: error.message };
        }
      })
  );