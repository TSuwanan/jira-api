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

      // GET /api/users - Get all users (admin only)
      .get("/", async ({ user, set }) => {
        try {
          const users = await UserController.getAllUsers(user);
          return {
            data: users,
            message: "Users retrieved successfully",
            status: 200
           };
        } catch (error: any) {
          if (error.message === "Unauthorized: Only admin can view users") {
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
          const validatedData = createUserSchema.parse(body);
          const newUser = await UserController.addUser(validatedData, user);

          set.status = 201;
          return { data: newUser, message: "User created successfully", status: 201 };
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

          if (error.message === "Unauthorized: Only admin can add users") {
            set.status = 403;
            return { error: error.message };
          }

          set.status = error.message === "Email already exists" ? 400 : 500;
          return { error: error.message };
        }
      })

      // DELETE /api/users/:id - Delete user (admin only)
      .delete("/:id", async ({ params, user, set }) => {
        try {
          const result = await UserController.deleteUser(params.id, user);
          return { data: result, message: "User deleted successfully", status: 200 };
        } catch (error: any) {
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
      })
  );
