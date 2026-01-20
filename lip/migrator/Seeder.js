import bcrypt from 'bcryptjs';

/**
 * Base Seeder Class
 * All seeders extend this class to get access to database helper methods
 */
export default class Seeder {
  constructor(db) {
    this.db = db;
    this.dependencies = []; // Override in child classes
  }

  /**
   * Override in child classes to define the seeding logic
   * @param {Object} db - Database connection
   */
  async run(db) {
    throw new Error('run() method must be implemented in seeder class');
  }

  /**
   * Check if data exists in table
   * @param {string} table - Table name
   * @param {Object} conditions - Where conditions
   */
  async exists(table, conditions = {}) {
    const keys = Object.keys(conditions);
    
    if (keys.length === 0) {
      // Check if table has any records
      const result = await this.db.query(`SELECT EXISTS(SELECT 1 FROM "${table}" LIMIT 1)`);
      return result.rows[0].exists;
    }
    
    // Build WHERE clause
    const whereClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(' AND ');
    const values = keys.map(key => conditions[key]);
    
    const sql = `SELECT EXISTS(SELECT 1 FROM "${table}" WHERE ${whereClause})`;
    const result = await this.db.query(sql, values);
    
    return result.rows[0].exists;
  }

  /**
   * Insert data into table (single record)
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @param {Object} options - Insert options
   */
  async insert(table, data, options = {}) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);
    
    const columns = keys.map(key => `"${key}"`).join(', ');
    const valueStr = placeholders.join(', ');
    
    let sql = `INSERT INTO "${table}" (${columns}) VALUES (${valueStr})`;
    
    if (options.onConflict) {
      sql += ` ON CONFLICT ${options.onConflict}`;
    }
    
    if (options.returning) {
      const returningCols = Array.isArray(options.returning) 
        ? options.returning.map(col => `"${col}"`).join(', ')
        : '"' + options.returning + '"';
      sql += ` RETURNING ${returningCols}`;
    }
    
    const result = await this.db.query(sql, values);
    return options.returning ? result.rows[0] : result;
  }

  /**
   * Insert multiple records into table
   * @param {string} table - Table name
   * @param {Array} dataArray - Array of data objects to insert
   * @param {Object} options - Insert options
   */
  async insertMany(table, dataArray, options = {}) {
    if (!dataArray.length) return [];
    
    const keys = Object.keys(dataArray[0]);
    const columns = keys.map(key => `"${key}"`).join(', ');
    
    // Build values for multiple rows
    const valueRows = [];
    const allValues = [];
    let paramIndex = 1;
    
    for (const data of dataArray) {
      const rowPlaceholders = keys.map(() => `$${paramIndex++}`);
      valueRows.push(`(${rowPlaceholders.join(', ')})`);
      allValues.push(...keys.map(key => data[key]));
    }
    
    let sql = `INSERT INTO "${table}" (${columns}) VALUES ${valueRows.join(', ')}`;
    
    if (options.onConflict) {
      sql += ` ON CONFLICT ${options.onConflict}`;
    }
    
    if (options.returning) {
      const returningCols = Array.isArray(options.returning) 
        ? options.returning.map(col => `"${col}"`).join(', ')
        : '"' + options.returning + '"';
      sql += ` RETURNING ${returningCols}`;
    }
    
    const result = await this.db.query(sql, allValues);
    return options.returning ? result.rows : result;
  }

  /**
   * Update data in table
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @param {Object} conditions - Where conditions
   */
  async update(table, data, conditions) {
    const dataKeys = Object.keys(data);
    const conditionKeys = Object.keys(conditions);
    
    // Build SET clause
    const setClause = dataKeys.map((key, index) => `"${key}" = $${index + 1}`).join(', ');
    
    // Build WHERE clause
    const whereClause = conditionKeys.map((key, index) => 
      `"${key}" = $${dataKeys.length + index + 1}`
    ).join(' AND ');
    
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const sql = `UPDATE "${table}" SET ${setClause} WHERE ${whereClause}`;
    return await this.db.query(sql, values);
  }

  /**
   * Delete data from table
   * @param {string} table - Table name
   * @param {Object} conditions - Where conditions
   */
  async delete(table, conditions) {
    const keys = Object.keys(conditions);
    const whereClause = keys.map((key, index) => `"${key}" = $${index + 1}`).join(' AND ');
    const values = Object.values(conditions);
    
    const sql = `DELETE FROM "${table}" WHERE ${whereClause}`;
    return await this.db.query(sql, values);
  }

  /**
   * Truncate table (remove all data)
   * @param {string} table - Table name
   * @param {Object} options - Truncate options
   */
  async truncate(table, options = {}) {
    let sql = `TRUNCATE TABLE "${table}"`;
    
    if (options.restart) {
      sql += ' RESTART IDENTITY';
    }
    
    if (options.cascade) {
      sql += ' CASCADE';
    }
    
    return await this.db.query(sql);
  }

  /**
   * Execute raw SQL
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   */
  async raw(sql, params = []) {
    return await this.db.query(sql, params);
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @param {number} rounds - Salt rounds (default: 12)
   */
  async hash(password, rounds = 12) {
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Generate UUID (PostgreSQL specific)
   */
  uuid() {
    return 'uuid_generate_v4()';
  }

  /**
   * Get current timestamp
   */
  now() {
    return new Date();
  }

  /**
   * Log seeding progress
   * @param {string} message - Log message
   */
  log(message) {
    console.log(`🌱 ${this.constructor.name}: ${message}`);
  }

  /**
   * Check if we're in a specific environment
   * @param {string} env - Environment name
   */
  isEnvironment(env) {
    return process.env.NODE_ENV === env;
  }

  /**
   * Skip seeding if not in specified environment
   * @param {string|Array} environments - Environment(s) to run in
   */
  onlyIn(environments) {
    const envs = Array.isArray(environments) ? environments : [environments];
    const currentEnv = process.env.NODE_ENV || 'development';
    
    if (!envs.includes(currentEnv)) {
      this.log(`Skipped (not in ${envs.join(', ')} environment)`);
      return false;
    }
    
    return true;
  }

  /**
   * Skip seeding in specified environment
   * @param {string|Array} environments - Environment(s) to skip
   */
  except(environments) {
    const envs = Array.isArray(environments) ? environments : [environments];
    const currentEnv = process.env.NODE_ENV || 'development';
    
    if (envs.includes(currentEnv)) {
      this.log(`Skipped (in ${currentEnv} environment)`);
      return false;
    }
    
    return true;
  }

  /**
   * Get seeder name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get dependencies for this seeder
   */
  getDependencies() {
    return this.dependencies;
  }

  /**
   * Upsert data (insert or update if exists)
   * @param {string} table - Table name
   * @param {Object} data - Data to upsert
   * @param {string|Array} conflictColumns - Columns to check for conflict
   * @param {Object} updateData - Data to update on conflict (optional)
   */
  async upsert(table, data, conflictColumns, updateData = null) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`);
    
    const columns = keys.map(key => `"${key}"`).join(', ');
    const valueStr = placeholders.join(', ');
    
    // Handle conflict columns
    const conflictCols = Array.isArray(conflictColumns) 
      ? conflictColumns.map(col => `"${col}"`).join(', ')
      : `"${conflictColumns}"`;
    
    let sql = `INSERT INTO "${table}" (${columns}) VALUES (${valueStr}) ON CONFLICT (${conflictCols})`;
    
    if (updateData) {
      // Update specific columns on conflict
      const updateKeys = Object.keys(updateData);
      const updateClause = updateKeys.map(key => `"${key}" = EXCLUDED."${key}"`).join(', ');
      sql += ` DO UPDATE SET ${updateClause}`;
    } else {
      // Update all columns with new values
      const updateClause = keys.map(key => `"${key}" = EXCLUDED."${key}"`).join(', ');
      sql += ` DO UPDATE SET ${updateClause}`;
    }
    
    sql += ' RETURNING *';
    
    const result = await this.db.query(sql, values);
    return result.rows[0];
  }
}
