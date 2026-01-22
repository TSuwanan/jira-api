import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/manage-users";

const app = new Elysia()
  .use(cors())
  .get("/", () => ({
    message: "Welcome to JIRA API",
    version: "1.0.0"
  }))
  .use(authRoutes)
  .use(userRoutes)
  .listen(process.env.PORT || 8000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);