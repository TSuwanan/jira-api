"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const db_1 = require("../utils/db");
const admin_check_1 = require("../utils/admin-check");
class ProjectController {
    // Get all projects with pagination and search
    static async getProjects(user, page = 1, search) {
        const limit = 10;
        const offset = (page - 1) * limit;
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can view users");
        }
        const searchParam = search ? `%${search}%` : null;
        // Get total count
        const countSearchCondition = search
            ? "AND (p.project_code ILIKE $1 OR p.name ILIKE $1)"
            : "";
        const countQuery = `
      SELECT COUNT(*)
      FROM projects p
      WHERE p.deleted_at IS NULL ${countSearchCondition}
    `;
        const countParams = search ? [searchParam] : [];
        const countResult = await db_1.pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);
        // Get projects data with owner info and project members
        const dataSearchCondition = search
            ? "AND (p.project_code ILIKE $3 OR p.name ILIKE $3)"
            : "";
        const query = `
      SELECT
        p.*,
        u.full_name as owner_name,
        u.email as owner_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pm_user.id,
              'user_code', pm_user.user_code,
              'full_name', pm_user.full_name,
              'email', pm_user.email
            )
          ) FILTER (WHERE pm_user.id IS NOT NULL),
          '[]'
        ) as members
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users pm_user ON pm.user_id = pm_user.id AND pm_user.deleted_at IS NULL
      WHERE p.deleted_at IS NULL ${dataSearchCondition}
      GROUP BY p.id, u.full_name, u.email
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
        const params = search ? [limit, offset, searchParam] : [limit, offset];
        const result = await db_1.pool.query(query, params);
        return {
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    }
    // Get single project by ID
    static async getProjectById(projectId, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can view project");
        }
        const query = `
      SELECT
        p.*,
        u.full_name as owner_name,
        u.email as owner_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pm_user.id,
              'user_code', pm_user.user_code,
              'full_name', pm_user.full_name,
              'email', pm_user.email
            )
          ) FILTER (WHERE pm_user.id IS NOT NULL),
          '[]'
        ) as members
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users pm_user ON pm.user_id = pm_user.id AND pm_user.deleted_at IS NULL
      WHERE p.id = $1 AND p.deleted_at IS NULL
      GROUP BY p.id, u.full_name, u.email
    `;
        const result = await db_1.pool.query(query, [projectId]);
        if (result.rows.length === 0) {
            throw new Error("Project not found");
        }
        return result.rows[0];
    }
    // Get project members by project ID
    static async getProjectMembers(projectId, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can view project members");
        }
        // Check if project exists
        const projectCheck = await db_1.pool.query("SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL", [projectId]);
        if (projectCheck.rows.length === 0) {
            throw new Error("Project not found");
        }
        const query = `
      SELECT
        u.id,
        u.user_code,
        u.full_name,
        u.email
      FROM project_members pm
      INNER JOIN users u ON pm.user_id = u.id AND u.deleted_at IS NULL
      WHERE pm.project_id = $1
    `;
        const result = await db_1.pool.query(query, [projectId]);
        return result.rows;
    }
    // Add new project
    static async addProject(data, user) {
        const { name, description, member_ids } = data;
        const finalOwnerId = user.id;
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can create project");
        }
        const result = await db_1.pool.query(`INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`, [name, description || null, finalOwnerId]);
        const projectId = result.rows[0].id;
        // Automatically add owner as a project member
        await db_1.pool.query(`INSERT INTO project_members (project_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [projectId, finalOwnerId]);
        // Add additional project members from array (excluding owner to avoid duplicates)
        if (member_ids && member_ids.length > 0) {
            const uniqueMemberIds = member_ids.filter(id => id !== finalOwnerId);
            if (uniqueMemberIds.length > 0) {
                // Build bulk insert query for project members
                const values = uniqueMemberIds.map((_, index) => `($1, $${index + 2})`).join(', ');
                const params = [projectId, ...uniqueMemberIds];
                await db_1.pool.query(`INSERT INTO project_members (project_id, user_id)
           VALUES ${values}
           ON CONFLICT DO NOTHING`, params);
            }
        }
        return result.rows[0];
    }
    // Edit project
    static async editProject(projectId, data, user) {
        // Check if project exists
        const existing = await db_1.pool.query("SELECT owner_id FROM projects WHERE id = $1 AND deleted_at IS NULL", [projectId]);
        if (existing.rows.length === 0) {
            throw new Error("Project not found");
        }
        // Check permissions: only owner or admin can edit
        const isAdmin = await (0, admin_check_1.isAdmin)(user.id);
        const isOwner = existing.rows[0].owner_id === user.id;
        if (!isAdmin && !isOwner) {
            throw new Error("Unauthorized: Only owner or admin can edit this project");
        }
        // Check if any tasks in this project are In Progress (I) or Done (D)
        const taskCheck = await db_1.pool.query("SELECT id FROM tasks WHERE project_id = $1 AND status IN ('I', 'D') AND deleted_at IS NULL", [projectId]);
        if (taskCheck.rows.length > 0) {
            throw new Error("Cannot edit project: Some tasks are In Progress or Done");
        }
        const { name, description, owner_id, member_ids } = data;
        // Build dynamic update query for project fields
        let updateFields = [];
        let params = [projectId];
        let paramIndex = 2;
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            params.push(name);
        }
        if (description !== undefined) {
            updateFields.push(`description = $${paramIndex++}`);
            params.push(description);
        }
        if (owner_id !== undefined) {
            updateFields.push(`owner_id = $${paramIndex++}`);
            params.push(owner_id);
        }
        let result;
        if (updateFields.length > 0) {
            updateFields.push(`updated_at = NOW()`);
            const query = `
        UPDATE projects
        SET ${updateFields.join(", ")}
        WHERE id = $1
        RETURNING *
      `;
            result = await db_1.pool.query(query, params);
        }
        else {
            result = await db_1.pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
        }
        // Update project members if member_ids is provided
        if (member_ids !== undefined) {
            // Delete existing members
            await db_1.pool.query("DELETE FROM project_members WHERE project_id = $1", [projectId]);
            // Insert new members if array is not empty
            if (member_ids.length > 0) {
                const values = member_ids.map((_, index) => `($1, $${index + 2})`).join(', ');
                const memberParams = [projectId, ...member_ids];
                await db_1.pool.query(`INSERT INTO project_members (project_id, user_id)
           VALUES ${values}
           ON CONFLICT DO NOTHING`, memberParams);
            }
        }
        return result.rows[0];
    }
    // Delete project (hard delete)
    static async deleteProject(projectId, user) {
        // Check project and permission
        const existing = await db_1.pool.query("SELECT owner_id FROM projects WHERE id = $1", [projectId]);
        if (existing.rows.length === 0) {
            throw new Error("Project not found");
        }
        const isAdmin = await (0, admin_check_1.isAdmin)(user.id);
        const isOwner = existing.rows[0].owner_id === user.id;
        if (!isAdmin && !isOwner) {
            throw new Error("Unauthorized: Only owner or admin can delete this project");
        }
        // Check if any tasks in this project are In Progress (I) or Done (D)
        const taskCheck = await db_1.pool.query("SELECT id FROM tasks WHERE project_id = $1 AND status IN ('I', 'D') AND deleted_at IS NULL", [projectId]);
        if (taskCheck.rows.length > 0) {
            throw new Error("Cannot delete project: Some tasks are In Progress or Done");
        }
        // Hard delete (cascade will handle project_members and tasks)
        await db_1.pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
        return { id: projectId, deleted: true };
    }
}
exports.ProjectController = ProjectController;
