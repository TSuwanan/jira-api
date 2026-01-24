"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elysia_1 = require("elysia");
const cors_1 = require("@elysiajs/cors");
const swagger_1 = require("@elysiajs/swagger");
const auth_1 = require("./routes/auth");
const manage_users_1 = require("./routes/manage-users");
const manage_roles_1 = require("./routes/manage-roles");
const manage_projects_1 = require("./routes/manage-projects");
const manage_tasks_1 = require("./routes/manage-tasks");
const app = new elysia_1.Elysia()
    .use((0, cors_1.cors)())
    .use((0, swagger_1.swagger)({
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
}))
    .use(auth_1.authRoutes)
    .use(manage_users_1.userRoutes)
    .use(manage_roles_1.roleRoutes)
    .use(manage_projects_1.projectRoutes)
    .use(manage_tasks_1.taskRoutes)
    .listen(process.env.PORT || 8000);
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
console.log("📘 Swagger → http://localhost:8000/swagger");
