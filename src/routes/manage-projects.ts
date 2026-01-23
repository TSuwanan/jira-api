import { Elysia } from "elysia";
import { ZodError } from "zod";
import { ProjectController } from "../controllers/manage-projects";
import { createProjectSchema, updateProjectSchema } from "../schemas/manage-projects";
import { jwtPlugin, authMiddleware } from "../middleware/auth";

export const projectRoutes = new Elysia({ prefix: "/api/projects" })
  .use(jwtPlugin)
  .guard({}, (app) =>
    app
      .use((app) => authMiddleware(app))

      // GET /api/projects - Get all projects with search/pagination
      .get("/", async ({ user, set, query }) => {
        try {
          const page = parseInt(query.page as string) || 1;
          const search = query.search as string | undefined;
          const result = await ProjectController.getProjects(user, page, search);
          return {
            ...result,
            message: "Projects retrieved successfully",
            status: 200
          };
        } catch (error: any) {
          set.status = 500;
          return { error: error.message };
        }
      })

      // GET /api/projects/:id - Get single project
      .get("/:id", async ({ params, set, user }) => {
        try {
          const result = await ProjectController.getProjectById(params.id, user);
          return { data: result, status: 200 };
        } catch (error: any) {
          set.status = error.message === "Project not found" ? 404 : 500;
          return { error: error.message };
        }
      })

      // POST /api/projects - Add new project
      .post("/", async ({ body, user, set }) => {
        try {
          const validatedData = createProjectSchema.parse(body);
          const newProject = await ProjectController.addProject(validatedData, user);

          set.status = 201;
          return { 
            data: newProject, 
            message: "Project created successfully", 
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

          set.status = 500;
          return { error: error.message };
        }
      })

      // PATCH /api/projects/:id - Edit project
      .put("/:id", async ({ params, body, user, set }) => {
        try {
          const validatedData = updateProjectSchema.parse(body);
          const updatedProject = await ProjectController.editProject(params.id, validatedData, user);

          return { 
            data: updatedProject, 
            message: "Project updated successfully", 
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

          if (error.message.includes("Unauthorized")) {
            set.status = 403;
          } else if (error.message === "Project not found") {
            set.status = 404;
          } else {
            set.status = 500;
          }
          
          return { error: error.message };
        }
      })

      // DELETE /api/projects/:id - Soft delete project
      .delete("/:id", async ({ params, user, set }) => {
        try {
          const result = await ProjectController.deleteProject(params.id, user);
          return { 
            data: result, 
            message: "Project deleted successfully", 
            status: 200 
          };
        } catch (error: any) {
          if (error.message.includes("Unauthorized")) {
            set.status = 403;
          } else if (error.message === "Project not found") {
            set.status = 404;
          } else {
            set.status = 500;
          }
          
          return { error: error.message };
        }
      })
  );
