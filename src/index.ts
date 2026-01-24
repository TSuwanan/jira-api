// import { Elysia } from "elysia";
// import { cors } from "@elysiajs/cors";
// import { swagger } from "@elysiajs/swagger";
// import { authRoutes } from "./routes/auth";
// import { userRoutes } from "./routes/manage-users";
// import { roleRoutes } from "./routes/manage-roles";
// import { projectRoutes } from "./routes/manage-projects";
// import { taskRoutes } from "./routes/manage-tasks";

// const app = new Elysia()
//   .use(cors())
//    .use(
//     swagger({
//       documentation: {
//         info: {
//           title: "My API",
//           version: "1.0.0",
//         },
//         components: {
//           securitySchemes: {
//             bearerAuth: {
//               type: "http",
//               scheme: "bearer",
//               bearerFormat: "JWT",
//             },
//           },
//         },
//         security: [
//           {
//             bearerAuth: [],
//           },
//         ],
//       },
//     })
//   )

//   .use(authRoutes)
//   .use(userRoutes)
//   .use(roleRoutes)
//   .use(projectRoutes)
//   .use(taskRoutes)
//   .listen(process.env.PORT || 8000);

// console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
// console.log("📘 Swagger → http://localhost:8000/swagger");
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/manage-users";
import { roleRoutes } from "./routes/manage-roles";
import { projectRoutes } from "./routes/manage-projects";
import { taskRoutes } from "./routes/manage-tasks";

// อ่าน swagger.yaml จาก root ของ project
const swaggerPath = join(process.cwd(), "swagger.yaml");
const swaggerDoc = load(readFileSync(swaggerPath, "utf8"));

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      documentation: swaggerDoc as any,
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