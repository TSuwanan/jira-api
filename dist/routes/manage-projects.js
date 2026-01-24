"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const elysia_1 = require("elysia");
const zod_1 = require("zod");
const manage_projects_1 = require("../controllers/manage-projects");
const manage_projects_2 = require("../schemas/manage-projects");
const auth_1 = require("../middleware/auth");
exports.projectRoutes = new elysia_1.Elysia({ prefix: "/api/projects" })
    .use(auth_1.jwtPlugin)
    .guard({}, (app) => app
    .use((app) => (0, auth_1.authMiddleware)(app))
    // GET /api/projects - Get all projects with search/pagination
    .get("/", async ({ user, set, query }) => {
    try {
        const page = parseInt(query.page) || 1;
        const search = query.search;
        const result = await manage_projects_1.ProjectController.getProjects(user, page, search);
        return {
            ...result,
            message: "Projects retrieved successfully",
            status: 200
        };
    }
    catch (error) {
        set.status = 500;
        return { error: error.message };
    }
})
    // GET /api/projects/:id - Get single project
    .get("/:id", async ({ params, set, user }) => {
    try {
        const result = await manage_projects_1.ProjectController.getProjectById(params.id, user);
        return { data: result, status: 200 };
    }
    catch (error) {
        set.status = error.message === "Project not found" ? 404 : 500;
        return { error: error.message };
    }
})
    // GET /api/projects/:id/members - Get project members
    .get("/:id/members", async ({ params, set, user }) => {
    try {
        const result = await manage_projects_1.ProjectController.getProjectMembers(params.id, user);
        return {
            data: result,
            message: "Project members retrieved successfully",
            status: 200
        };
    }
    catch (error) {
        if (error.message.includes("Unauthorized")) {
            set.status = 403;
        }
        else if (error.message === "Project not found") {
            set.status = 404;
        }
        else {
            set.status = 500;
        }
        return { error: error.message };
    }
})
    // POST /api/projects - Add new project
    .post("/", async ({ body, user, set }) => {
    try {
        const validatedData = manage_projects_2.createProjectSchema.parse(body);
        const newProject = await manage_projects_1.ProjectController.addProject(validatedData, user);
        set.status = 201;
        return {
            data: newProject,
            message: "Project created successfully",
            status: 201
        };
    }
    catch (error) {
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
        set.status = 500;
        return { error: error.message };
    }
})
    // PATCH /api/projects/:id - Edit project
    .put("/:id", async ({ params, body, user, set }) => {
    try {
        const validatedData = manage_projects_2.updateProjectSchema.parse(body);
        const updatedProject = await manage_projects_1.ProjectController.editProject(params.id, validatedData, user);
        return {
            data: updatedProject,
            message: "Project updated successfully",
            status: 200
        };
    }
    catch (error) {
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
        if (error.message.includes("Unauthorized")) {
            set.status = 403;
        }
        else if (error.message === "Project not found") {
            set.status = 404;
        }
        else {
            set.status = 500;
        }
        return { error: error.message };
    }
})
    // DELETE /api/projects/:id - Soft delete project
    .delete("/:id", async ({ params, user, set }) => {
    try {
        const result = await manage_projects_1.ProjectController.deleteProject(params.id, user);
        return {
            data: result,
            message: "Project deleted successfully",
            status: 200
        };
    }
    catch (error) {
        if (error.message.includes("Unauthorized")) {
            set.status = 403;
        }
        else if (error.message === "Project not found") {
            set.status = 404;
        }
        else {
            set.status = 500;
        }
        return { error: error.message };
    }
}));
