import { Elysia } from "elysia";
import { ZodError } from "zod";
import { UserController } from "../controllers/manage-users";
import { createUserSchema } from "../schemas/manage-users";
import { jwtPlugin, authMiddleware } from "../middleware/auth";

export const userRoutes = new Elysia({ prefix: "/api/users" })
  .use(jwtPlugin)
  .guard({}, (app) =>
    app
      .use((app) => authMiddleware(app))

      // GET /api/users - Get all users
      .get("/", async ({ set }) => {
        try {
          const users = await UserController.getAllUsers();
          return { users };
        } catch (error: any) {
          set.status = 500;
          return { error: error.message };
        }
      })

      // POST /api/users - Add new user
      .post("/", async ({ body, set }) => {
        try {
          const validatedData = createUserSchema.parse(body);
          const user = await UserController.addUser(validatedData);

          set.status = 201;
          return { user };
        } catch (error: any) {
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

          set.status = error.message === "Email already exists" ? 400 : 500;
          return { error: error.message };
        }
      })
  );
