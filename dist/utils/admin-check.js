"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = isAdmin;
const db_1 = require("./db");
/**
 * Check if a user has admin privileges (role_id === 1)
 * @param userId The UUID of the user to check
 * @returns Promise<boolean>
 */
async function isAdmin(userId) {
    const requester = await db_1.pool.query("SELECT role_id FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
    return requester.rows.length > 0 && requester.rows[0].role_id === 1;
}
