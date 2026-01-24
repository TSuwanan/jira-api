"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const db_1 = require("../utils/db");
const admin_check_1 = require("../utils/admin-check");
class TaskController {
    // Get tasks with optional project filter, search and status
    static async getTasks(user, projectId, page = 1, search, status) {
        const isAdmin = await (0, admin_check_1.isAdmin)(user.id);
        const limit = 10;
        const offset = (page - 1) * limit;
        let conditions = ["t.deleted_at IS NULL"];
        let params = [];
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
        if (status) {
            conditions.push(`t.status = $${paramIndex++}`);
            params.push(status);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        // Total count
        const countResult = await db_1.pool.query(`SELECT COUNT(*) FROM tasks t ${whereClause}`, params);
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
        const result = await db_1.pool.query(query, dataParams);
        return {
            data: result.rows,
            pagination: { page, limit, total, totalPages }
        };
    }
    // Get single task
    static async getTaskById(taskId, user) {
        const query = `
      SELECT t.*, p.name as project_name, u1.full_name as assignee_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u1 ON t.assignee_id = u1.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `;
        const result = await db_1.pool.query(query, [taskId]);
        if (result.rows.length === 0) {
            throw new Error("Task not found");
        }
        return result.rows[0];
    }
    // Add task
    static async addTask(data, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can create task");
        }
        const { project_id, title, description, status, priority, assignee_id, due_date } = data;
        // Verify project exists
        const projectCheck = await db_1.pool.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL", [project_id]);
        if (projectCheck.rows.length === 0) {
            throw new Error("Project not found");
        }
        const result = await db_1.pool.query(`INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [project_id, title, description || null, status || 'T', priority || null, assignee_id || null, user.id, due_date || null]);
        const newTask = result.rows[0];
        await this.updateProjectTaskCount(project_id);
        return newTask;
    }
    // Edit task
    static async editTask(taskId, data, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can edit task");
        }
        const existing = await db_1.pool.query("SELECT id FROM tasks WHERE id = $1 AND deleted_at IS NULL", [taskId]);
        if (existing.rows.length === 0) {
            throw new Error("Task not found");
        }
        const { title, description, status, priority, assignee_id, due_date } = data;
        let updateFields = [];
        let params = [taskId];
        let paramIndex = 2;
        if (title !== undefined) {
            updateFields.push(`title = $${paramIndex++}`);
            params.push(title);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            params.push(description);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        if (priority !== undefined) {
            updateFields.push(`priority = $${paramIndex++}`);
            params.push(priority);
        }
        if (assignee_id !== undefined) {
            updateFields.push(`assignee_id = $${paramIndex++}`);
            params.push(assignee_id);
        }
        if (due_date !== undefined) {
            updateFields.push(`due_date = $${paramIndex++}`);
            params.push(due_date);
        }
        if (updateFields.length === 0) {
            return this.getTaskById(taskId, user);
        }
        updateFields.push(`updated_at = NOW()`);
        const query = `UPDATE tasks SET ${updateFields.join(", ")} WHERE id = $1 RETURNING *`;
        const result = await db_1.pool.query(query, params);
        return result.rows[0];
    }
    // Delete task (Hard delete)
    static async deleteTask(taskId, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can delete task");
        }
        const existing = await db_1.pool.query("SELECT id, project_id FROM tasks WHERE id = $1 AND deleted_at IS NULL", [taskId]);
        if (existing.rows.length === 0) {
            throw new Error("Task not found");
        }
        await db_1.pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);
        // Update project's task_count
        await this.updateProjectTaskCount(existing.rows[0].project_id);
        return { id: taskId, deleted: true };
    }
    // Complete task - Update status to 'D' and add comment
    static async completeTask(taskId, data, user) {
        // Check if task exists
        const existing = await db_1.pool.query("SELECT id, status FROM tasks WHERE id = $1 AND deleted_at IS NULL", [taskId]);
        if (existing.rows.length === 0) {
            throw new Error("Task not found");
        }
        const task = existing.rows[0];
        if (task.status === 'D') {
            throw new Error("Task is already completed");
        }
        // Update task status to 'D' (Done)
        await db_1.pool.query(`UPDATE tasks SET status = 'D', updated_at = NOW() WHERE id = $1`, [taskId]);
        // Insert comment
        await db_1.pool.query(`INSERT INTO comments (task_id, user_id, content) VALUES ($1, $2, $3)`, [taskId, user.id, data.comment]);
        // Return updated task
        const result = await db_1.pool.query(`SELECT t.*, p.name as project_name, u1.full_name as assignee_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u1 ON t.assignee_id = u1.id
       WHERE t.id = $1`, [taskId]);
        return result.rows[0];
    }
    // Helper to update project's task_count
    static async updateProjectTaskCount(projectId) {
        await db_1.pool.query(`
      UPDATE projects
      SET task_count = (SELECT COUNT(*) FROM tasks WHERE project_id = $1 AND deleted_at IS NULL)
      WHERE id = $1
    `, [projectId]);
    }
}
exports.TaskController = TaskController;
