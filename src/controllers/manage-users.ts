import bcrypt from "bcryptjs";
import { pool } from "../utils/db";
import { CreateUserInput } from "../schemas/manage-users";
import { isAdmin as checkIsAdmin } from "../utils/admin-check";

export class UserController {
  // Get all users (admin only) with pagination and search
  static async getUsers(user: any, page: number = 1, search?: string) {
    const limit = 10;
    const offset = (page - 1) * limit;

    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can view users");
    }

    // Build search condition
    const searchCondition = search
      ? "AND (u.user_code ILIKE $3 OR u.full_name ILIKE $3)"
      : "";
    const searchParam = search ? `%${search}%` : null;

    // Get total count
    const countQuery = search
      ? "SELECT COUNT(*) FROM users u WHERE u.deleted_at IS NULL AND (u.user_code ILIKE $1 OR u.full_name ILIKE $1)"
      : "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL";
    const countParams = search ? [searchParam] : [];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const query = `SELECT u.id, u.user_code, u.email, u.full_name, u.role_id, r.name as role_name, u.position_code, u.level_code, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL ${searchCondition}
       ORDER BY u.user_code ASC
       LIMIT $1 OFFSET $2`;
    const params = search ? [limit, offset, searchParam] : [limit, offset];
    const result = await pool.query(query, params);

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

  // Add new user (admin only)
  static async addUser(data: CreateUserInput, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can add users");
    }

    const { email, full_name, role_id, position_code, level_code } = data;

    // Check if email exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error("Email already exists");
    }

    // Generate password based on role: admin123 for admin, user123 for user
    const defaultPassword = role_id === 1 ? "admin123" : "user123";
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, position_code, level_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_code, email, full_name, role_id, position_code, level_code, created_at`,
      [email, password_hash, full_name, role_id || 2, position_code || null, level_code || null]
    );

    return result.rows[0];
  }

  // Delete user (admin only) - soft delete
  static async deleteUser(userId: string, user: any) {
    if (!(await checkIsAdmin(user.id))) {
      throw new Error("Unauthorized: Only admin can delete users");
    }

    // Check if user exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL",
      [userId]
    );

    if (existing.rows.length === 0) {
      throw new Error("User not found");
    }

    // Prevent deleting self
    if (userId === user.id) {
      throw new Error("Cannot delete yourself");
    }

    // Soft delete
    await pool.query(
      "UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
      [userId]
    );

    const deletedUser = await pool.query(
      "SELECT id, user_code, email, full_name, role_id, position_code, level_code, deleted_at FROM users WHERE id = $1 AND deleted_at IS NOT NULL",
      [userId]
    );

    return deletedUser.rows[0];
  }
}
