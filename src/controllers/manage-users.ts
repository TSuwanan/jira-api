import bcrypt from "bcryptjs";
import { pool } from "../utils/db";
import { CreateUserInput } from "../schemas/manage-users";

export class UserController {
  // Get all users
  static async getAllUsers() {
    const result = await pool.query(
      `SELECT id, user_code, email, full_name, role_id,
              position_code, level_code, created_at, updated_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    return result.rows;
  }

  // Add new user
  static async addUser(data: CreateUserInput) {
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
}
