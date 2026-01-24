import { Elysia } from "elysia";
import { ZodError } from "zod";
import { TaskController } from "../controllers/manage-tasks";
import { createTaskSchema, updateTaskSchema, completeTaskSchema } from "../schemas/manage-tasks";
import { jwtPlugin, authMiddleware } from "../middleware/auth";

export const taskRoutes = new Elysia({ prefix: "/api/tasks" })
  .use(jwtPlugin)
  .guard({}, (app) =>
    app
      .use((app) => authMiddleware(app))

      // GET /api/tasks - Get all tasks
      .get("/", async ({ user, set, query }) => {
        try {
          const page = parseInt(query.page as string) || 1;
          const search = query.search as string | undefined;
          const projectId = query.projectId as string | undefined;
          const status = query.status as string | undefined;
          
          const result = await TaskController.getTasks(user, projectId, page, search, status);
          return {
            ...result,
            message: "Tasks retrieved successfully",
            status: 200
          };
        } catch (error: any) {
          set.status = error.message.includes("Unauthorized") ? 403 : 500;
          return { error: error.message };
        }
      })

      // GET /api/tasks/:id - Get single task
      .get("/:id", async ({ params, user, set }) => {
        try {
          const result = await TaskController.getTaskById(params.id, user);
          return { data: result, status: 200 };
        } catch (error: any) {
          if (error.message.includes("Unauthorized")) set.status = 403;
          else if (error.message === "Task not found") set.status = 404;
          else set.status = 500;
          return { error: error.message };
        }
      })

      // POST /api/tasks - Add new task
      .post("/", async ({ body, user, set }) => {
        try {
          const validatedData = createTaskSchema.parse(body);
          const newTask = await TaskController.addTask(validatedData, user);

          set.status = 201;
          return { 
            data: newTask, 
            message: "Task created successfully", 
            status: 201 
          };
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

          set.status = error.message.includes("Unauthorized") ? 403 : 500;
          return { error: error.message };
        }
      })

      // PUT /api/tasks/:id - Edit task
      .put("/:id", async ({ params, body, user, set }) => {
        try {
          const validatedData = updateTaskSchema.parse(body);
          const updatedTask = await TaskController.editTask(params.id, validatedData, user);

          return { 
            data: updatedTask, 
            message: "Task updated successfully", 
            status: 200 
          };
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

          if (error.message.includes("Unauthorized")) set.status = 403;
          else if (error.message === "Task not found") set.status = 404;
          else set.status = 500;
          
          return { error: error.message };
        }
      })

      // DELETE /api/tasks/:id - delete task
      .delete("/:id", async ({ params, user, set }) => {
        try {
          const result = await TaskController.deleteTask(params.id, user);
          return {
            data: result,
            message: "Task deleted successfully",
            status: 200
          };
        } catch (error: any) {
          if (error.message.includes("Unauthorized")) set.status = 403;
          else if (error.message === "Task not found") set.status = 404;
          else set.status = 500;

          return { error: error.message };
        }
      })

      // PUT /api/tasks/:id/status - Update task status and add comment
      .put("/:id/status", async ({ params, body, user, set }) => {
        try {
          const validatedData = completeTaskSchema.parse(body);
          const result = await TaskController.updateTaskStatus(params.id, validatedData, user);

          return {
            data: result,
            message: "Task completed successfully",
            status: 200
          };
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

          if (error.message === "Task not found") set.status = 404;
          else if (error.message === "Task is already completed") set.status = 400;
          else set.status = 500;

          return { error: error.message };
        }
      })
  );
