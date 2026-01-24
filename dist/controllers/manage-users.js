"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../utils/db");
const admin_check_1 = require("../utils/admin-check");
class UserController {
    // Get all users (admin only) with pagination and search
    static async getUsers(user, page = 1, search) {
        const limit = 10;
        const offset = (page - 1) * limit;
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
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
        const countResult = await db_1.pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);
        const query = `SELECT u.id, u.user_code, u.email, u.full_name, u.role_id, r.name as role_name, u.position_code, u.level_code, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.deleted_at IS NULL ${searchCondition}
       ORDER BY u.user_code ASC
       LIMIT $1 OFFSET $2`;
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
    // Get all members (role_id = 2) for dropdowns/selection
    static async getMembers(user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can view members");
        }
        const query = `
      SELECT u.id, u.user_code, u.full_name, u.email, u.position_code, u.level_code
      FROM users u
      WHERE u.role_id = 2 AND u.deleted_at IS NULL
      ORDER BY u.user_code ASC
    `;
        const result = await db_1.pool.query(query);
        return result.rows;
    }
    // Add new user (admin only)
    static async addUser(data, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can add users");
        }
        const { email, full_name, role_id, position_code, level_code } = data;
        // Check if email exists
        const existing = await db_1.pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            throw new Error("Email already exists");
        }
        // Generate password based on role: admin123 for admin, user123 for user
        const defaultPassword = role_id === 1 ? "admin123" : "user123";
        const password_hash = await bcryptjs_1.default.hash(defaultPassword, 10);
        // Insert user
        const result = await db_1.pool.query(`INSERT INTO users (email, password_hash, full_name, role_id, position_code, level_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_code, email, full_name, role_id, position_code, level_code, created_at`, [email, password_hash, full_name, role_id || 2, position_code || null, level_code || null]);
        return result.rows[0];
    }
    // Delete user (admin only) - soft delete
    static async deleteUser(userId, user) {
        if (!(await (0, admin_check_1.isAdmin)(user.id))) {
            throw new Error("Unauthorized: Only admin can delete users");
        }
        // Check if user exists
        const existing = await db_1.pool.query("SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
        if (existing.rows.length === 0) {
            throw new Error("User not found");
        }
        // Prevent deleting self
        if (userId === user.id) {
            throw new Error("Cannot delete yourself");
        }
        // Soft delete
        await db_1.pool.query("UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1", [userId]);
        const deletedUser = await db_1.pool.query("SELECT id, user_code, email, full_name, role_id, position_code, level_code, deleted_at FROM users WHERE id = $1 AND deleted_at IS NOT NULL", [userId]);
        return deletedUser.rows[0];
    }
}
exports.UserController = UserController;
