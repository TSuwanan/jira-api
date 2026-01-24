"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const db_1 = require("../utils/db");
class RoleController {
    // Get all roles
    static async getRoles() {
        const result = await db_1.pool.query(`SELECT id, name
       FROM roles
       ORDER BY id ASC`);
        return result.rows;
    }
}
exports.RoleController = RoleController;
