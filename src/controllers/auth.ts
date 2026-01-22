import bcrypt from "bcryptjs";
import { pool } from "../utils/db";
import { RegisterInput, LoginInput } from "../schemas/auth";

export class AuthController {
  // Register
  static async register(data: RegisterInput) {
    const { email, password, full_name } = data;

    // Check if user exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Email already exists");
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role_id) 
       VALUES ($1, $2, $3, 2) 
       RETURNING id, user_code, email, full_name, role_id, created_at`,
      [email, password_hash, full_name]
    );

    const user = result.rows[0];

    return {
      id: user.id,
      user_code: user.user_code,
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id,
      created_at: user.created_at,
    };
  }

  // Login
  static async login(data: LoginInput) {
    const { email, password } = data;

    // Find user
    const result = await pool.query(
      `SELECT id, user_code, email, password_hash, full_name, role_id, created_at 
       FROM users WHERE email = $1`,
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
      created_at: user.created_at,
    };
  }

  // Get current user
  static async getCurrentUser(userId: string) {
    const result = await pool.query(
      `SELECT id, user_code, email, full_name, role_id, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  }
}