import bcrypt from "bcryptjs";
import { pool } from "../utils/db";
import { CreateUserInput } from "../schemas/users";

export class UserController {
  // Get all users (admin only)
  static async getAllUsers(user: any) {

    // Check if requester is admin
    const requester = await pool.query(
      "SELECT role_id FROM users WHERE id = $1 AND deleted_at IS NULL",
      [user.id]
    );

    if (requester.rows.length === 0 || requester.rows[0].role_id !== 1) {
      throw new Error("Unauthorized: Only admin can view users");
    }

    const result = await pool.query(
      `SELECT id, user_code, email, full_name, role_id, position_code, level_code, created_at, updated_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Add new user (admin only)
  static async addUser(data: CreateUserInput, user: any) {
    // Check if requester is admin
    const requester = await pool.query(
      "SELECT role_id FROM users WHERE id = $1",
      [user.id]
    );

    if (requester.rows.length === 0 || requester.rows[0].role_id !== 1) {
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
    // Check if requester is admin
    const requester = await pool.query(
      "SELECT role_id FROM users WHERE id = $1 AND deleted_at IS NULL",
      [user.id]
    );

    if (requester.rows.length === 0 || requester.rows[0].role_id !== 1) {
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
