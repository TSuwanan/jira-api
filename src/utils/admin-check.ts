import { pool } from "./db";

/**
 * Check if a user has admin privileges (role_id === 1)
 * @param userId The UUID of the user to check
 * @returns Promise<boolean>
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const requester = await pool.query(
    "SELECT role_id FROM users WHERE id = $1 AND deleted_at IS NULL",
    [userId]
  );
  return requester.rows.length > 0 && requester.rows[0].role_id === 1;
}
