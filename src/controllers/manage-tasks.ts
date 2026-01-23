import { pool } from "../utils/db";
import { CreateTaskInput, UpdateTaskInput } from "../schemas/manage-tasks";
import { isAdmin as checkIsAdmin } from "../utils/admin-check";

export class TaskController {
  // Get tasks with optional project filter and search
  static async getTasks(user: any, projectId?: string, page: number = 1, search?: string) {
    const isAdmin = await checkIsAdmin(user.id);
    const limit = 10;
    const offset = (page - 1) * limit;

    let conditions = ["t.deleted_at IS NULL"];
    let params: any[] = [];
    let paramIndex = 1;

    // If not admin, only show tasks assigned to the user
    if (!isAdmin) {
      conditions.push(`t.assignee_id = $${paramIndex++}`);
      params.push(user.id);
    }

    if (projectId) {
      conditions.push(`t.project_id = $${paramIndex++}`);
      params.push(projectId);
    }

    if (search) {
      conditions.push(`(t.task_code ILIKE $${paramIndex} OR t.title ILIKE $${paramIndex++})`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    // Data query
    const dataParams = [...params, limit, offset];
    const query = `
      SELECT t.*, 
             p.name as project_name, 
             u1.full_name as assignee_name, 
             u2.full_name as creator_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await pool.query(query, dataParams);

    return {
      data: result.rows,
      pagination: { page, limit, total, totalPages }
    };
  }

  // Get single task
  static async getTaskById(taskId: string, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can view task");
    }

    const query = `
      SELECT t.*, p.name as project_name, u1.full_name as assignee_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
    const result = await pool.query(query, [taskId]);

    if (result.rows.length === 0) {
      throw new Error("Task not found");
    }

    return result.rows[0];
  }

  // Add task
  static async addTask(data: CreateTaskInput, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can create task");
    }

    const { project_id, title, description, status, priority, assignee_id, due_date } = data;

    // Verify project exists
    const projectCheck = await pool.query(
      "SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL",
      [project_id]
    );
    if (projectCheck.rows.length === 0) {
      throw new Error("Project not found");
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title, description || null, status || 'T', priority || null, assignee_id || null, user.id, due_date || null]
    );

    return result.rows[0];
  }

  // Edit task
  static async editTask(taskId: string, data: UpdateTaskInput, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can edit task");
    }

    const existing = await pool.query(
      "SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL",
      [taskId]
    );
    if (existing.rows.length === 0) {
      throw new Error("Task not found");
    }

    const { title, description, status, priority, assignee_id, due_date } = data;

    let updateFields = [];
    let params: any[] = [taskId];
    let paramIndex = 2;

    if (title !== undefined) { updateFields.push(`title = $${paramIndex++}`); params.push(title); }
    if (description !== undefined) { updateFields.push(`description = $${paramIndex++}`); params.push(description); }
    if (status !== undefined) { updateFields.push(`status = $${paramIndex++}`); params.push(status); }
    if (priority !== undefined) { updateFields.push(`priority = $${paramIndex++}`); params.push(priority); }
    if (assignee_id !== undefined) { updateFields.push(`assignee_id = $${paramIndex++}`); params.push(assignee_id); }
    if (due_date !== undefined) { updateFields.push(`due_date = $${paramIndex++}`); params.push(due_date); }

    if (updateFields.length === 0) {
      return this.getTaskById(taskId, user);
    }

    updateFields.push(`updated_at = NOW()`);
    const query = `UPDATE tasks SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, params);
    
    return result.rows[0];
  }

  // Delete task (Hard delete)
  static async deleteTask(taskId: string, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can delete task");
    }

    const existing = await pool.query(
      "SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL",
      [taskId]
    );
    if (existing.rows.length === 0) {
      throw new Error("Task not found");
    }

    await pool.query(
      "DELETE FROM tasks WHERE id = $1",
      [taskId]
    );

    return { id: taskId, deleted: true };
  }
}
