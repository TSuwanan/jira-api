import bcrypt from "bcryptjs";
import { pool } from "../utils/db";
import { LoginInput } from "../schemas/auth";

export class AuthController {
  // Login
  static async login(data: LoginInput) {
    const { email, password } = data;
      
    // Check if user is deleted
    const checkUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND deleted_at IS NOT NULL",
      [email]
      );
    
    if (checkUser.rows.length > 0) {
      throw new Error("User not found");
    }

    // Find user
    const result = await pool.query(
      `SELECT id, user_code, email, password_hash, full_name, role_id, position_code, level_code, created_at 
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      throw new Error("Invalid credentials");
    }

    return {
      id: user.id,
      user_code: user.user_code,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
      position_code: user.position_code,
      level_code: user.level_code,
      created_at: user.created_at,
    };
  }

  // Get current user
  static async getCurrentUser(userId: string) {
    const result = await pool.query(
      `SELECT id, user_code, email, full_name, role_id, position_code, level_code, created_at 
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  }
}