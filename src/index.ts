import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/manage-users";
import { roleRoutes } from "./routes/manage-roles";
import { projectRoutes } from "./routes/manage-projects";
import { taskRoutes } from "./routes/manage-tasks";

const app = new Elysia()
  .use(cors())
   .use(
    swagger({
      documentation: {
        info: {
          title: "My API",
          version: "1.0.0",
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    })
  )

  .use(authRoutes)
  .use(userRoutes)
  .use(roleRoutes)
  .use(projectRoutes)
  .use(taskRoutes)
  .listen(process.env.PORT || 8000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
console.log("📘 Swagger → http://localhost:8000/swagger");