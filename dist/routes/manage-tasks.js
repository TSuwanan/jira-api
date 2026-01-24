"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;
const elysia_1 = require("elysia");
const zod_1 = require("zod");
const manage_tasks_1 = require("../controllers/manage-tasks");
const manage_tasks_2 = require("../schemas/manage-tasks");
const auth_1 = require("../middleware/auth");
exports.taskRoutes = new elysia_1.Elysia({ prefix: "/api/tasks" })
    .use(auth_1.jwtPlugin)
    .guard({}, (app) => app
    .use((app) => (0, auth_1.authMiddleware)(app))
    // GET /api/tasks - Get all tasks
    .get("/", async ({ user, set, query }) => {
    try {
        const page = parseInt(query.page) || 1;
        const search = query.search;
        const projectId = query.projectId;
        const status = query.status;
        const result = await manage_tasks_1.TaskController.getTasks(user, projectId, page, search, status);
        return {
            ...result,
            message: "Tasks retrieved successfully",
            status: 200
        };
    }
    catch (error) {
        set.status = error.message.includes("Unauthorized") ? 403 : 500;
        return { error: error.message };
    }
})
    // GET /api/tasks/:id - Get single task
    .get("/:id", async ({ params, user, set }) => {
    try {
        const result = await manage_tasks_1.TaskController.getTaskById(params.id, user);
        return { data: result, status: 200 };
    }
    catch (error) {
        if (error.message.includes("Unauthorized"))
            set.status = 403;
        else if (error.message === "Task not found")
            set.status = 404;
        else
            set.status = 500;
        return { error: error.message };
    }
})
    // POST /api/tasks - Add new task
    .post("/", async ({ body, user, set }) => {
    try {
        const validatedData = manage_tasks_2.createTaskSchema.parse(body);
        const newTask = await manage_tasks_1.TaskController.addTask(validatedData, user);
        set.status = 201;
        return {
            data: newTask,
            message: "Task created successfully",
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
        set.status = error.message.includes("Unauthorized") ? 403 : 500;
        return { error: error.message };
    }
})
    // PUT /api/tasks/:id - Edit task
    .put("/:id", async ({ params, body, user, set }) => {
    try {
        const validatedData = manage_tasks_2.updateTaskSchema.parse(body);
        const updatedTask = await manage_tasks_1.TaskController.editTask(params.id, validatedData, user);
        return {
            data: updatedTask,
            message: "Task updated successfully",
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
        if (error.message.includes("Unauthorized"))
            set.status = 403;
        else if (error.message === "Task not found")
            set.status = 404;
        else
            set.status = 500;
        return { error: error.message };
    }
})
    // DELETE /api/tasks/:id - delete task
    .delete("/:id", async ({ params, user, set }) => {
    try {
        const result = await manage_tasks_1.TaskController.deleteTask(params.id, user);
        return {
            data: result,
            message: "Task deleted successfully",
            status: 200
        };
    }
    catch (error) {
        if (error.message.includes("Unauthorized"))
            set.status = 403;
        else if (error.message === "Task not found")
            set.status = 404;
        else
            set.status = 500;
        return { error: error.message };
    }
})
    // PATCH /api/tasks/:id/complete - Complete task and add comment
    .patch("/:id/complete", async ({ params, body, user, set }) => {
    try {
        const validatedData = manage_tasks_2.completeTaskSchema.parse(body);
        const result = await manage_tasks_1.TaskController.completeTask(params.id, validatedData, user);
        return {
            data: result,
            message: "Task completed successfully",
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
        if (error.message === "Task not found")
            set.status = 404;
        else if (error.message === "Task is already completed")
            set.status = 400;
        else
            set.status = 500;
        return { error: error.message };
    }
}));
