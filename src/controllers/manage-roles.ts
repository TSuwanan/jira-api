import { pool } from "../utils/db";

export class RoleController {
  // Get all roles
  static async getRoles() {
    const result = await pool.query(
      `SELECT id, name
       FROM roles
       ORDER BY id ASC`
    );
    return result.rows;
  }
}
