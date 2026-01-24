"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../utils/db");
class AuthController {
    // Login
    static async login(data) {
        const { email, password } = data;
        // Check if user is deleted
        const checkUser = await db_1.pool.query("SELECT id FROM users WHERE email = $1 AND deleted_at IS NOT NULL", [email]);
        if (checkUser.rows.length > 0) {
            throw new Error("User not found");
        }
        // Find user
        const result = await db_1.pool.query(`SELECT id, user_code, email, password_hash, full_name, role_id, position_code, level_code, created_at 
       FROM users WHERE email = $1 AND deleted_at IS NULL`, [email]);
        if (result.rows.length === 0) {
            throw new Error("Invalid credentials");
        }
        const user = result.rows[0];
        // Verify password
        const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
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
    static async getCurrentUser(userId) {
        const result = await db_1.pool.query(`SELECT id, user_code, email, full_name, role_id, position_code, level_code, created_at 
       FROM users WHERE id = $1 AND deleted_at IS NULL`, [userId]);
        if (result.rows.length === 0) {
            throw new Error("User not found");
        }
        return result.rows[0];
    }
}
exports.AuthController = AuthController;
