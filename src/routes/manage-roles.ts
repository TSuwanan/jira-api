import { Elysia } from "elysia";
import { RoleController } from "../controllers/manage-roles";
import { jwtPlugin, authMiddleware } from "../middleware/auth";

export const roleRoutes = new Elysia({ prefix: "/api/roles" })
  .use(jwtPlugin)
  .guard({}, (app) =>
    app
      .use((app) => authMiddleware(app))

      // GET /api/roles - Get all roles
      .get("/", async ({ set }) => {
        try {
          const roles = await RoleController.getRoles();
          return {
            data: roles,
            message: "Roles retrieved successfully",
            status: 200
          };
        } catch (error: any) {
          set.status = 500;
          return { error: error.message };
        }
      })
  );
