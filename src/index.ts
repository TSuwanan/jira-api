import { Elysia } from "elysia";
import { authRoutes } from "./routes/auth";

const app = new Elysia()
  .get("/", () => ({ 
    message: "Welcome to JIRA API",
    version: "1.0.0"
  }))
  .use(authRoutes)
  .listen(process.env.PORT || 8000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
