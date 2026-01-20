/**
 * Base Migration Class
 * All migrations extend this class to get access to schema building methods
 */
export default class Migration {
  constructor(db) {
    this.db = db;
    this.tableName = null;
  }

  /**
   * Override in child classes to define the migration
   * @param {Object} db - Database connection
   */
  async up(db) {
    throw new Error('up() method must be implemented in migration class');
  }

  /**
   * Override in child classes to define rollback
   * @param {Object} db - Database connection
   */
  async down(db) {
    throw new Error('down() method must be implemented in migration class');
  }

  /**
   * Create a new table
   * @param {string} tableName 
   * @param {Function} callback - Schema definition callback
   */
  async createTable(tableName, callback) {
    const { SchemaBuilder } = await import('./SchemaBuilder.js');
    const schema = new SchemaBuilder(tableName, 'create');
    
    if (callback) {
      callback(schema);
    }

    const sql = schema.toSQL();
    console.log(`Creating table: ${tableName}`);
    await this.db.query(sql);
  }

  /**
   * Modify an existing table
   * @param {string} tableName 
   * @param {Function} callback - Schema modification callback
   */
  async alterTable(tableName, callback) {
    const { SchemaBuilder } = await import('./SchemaBuilder.js');
    const schema = new SchemaBuilder(tableName, 'alter');
    
    if (callback) {
      callback(schema);
    }

    const sql = schema.toSQL();
    console.log(`Altering table: ${tableName}`);
    await this.db.query(sql);
  }

  /**
   * Drop a table
   * @param {string} tableName 
   * @param {Object} options
   */
  async dropTable(tableName, options = {}) {
    const cascade = options.cascade ? 'CASCADE' : '';
    const ifExists = options.ifExists !== false ? 'IF EXISTS' : '';
    
    const sql = `DROP TABLE ${ifExists} "${tableName}" ${cascade}`.trim();
    console.log(`Dropping table: ${tableName}`);
    await this.db.query(sql);
  }

  /**
   * Add index to table
   * @param {string} tableName 
   * @param {string|Array} columns 
   * @param {Object} options
   */
  async addIndex(tableName, columns, options = {}) {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    const indexName = options.name || `idx_${tableName}_${cols.replace(/[\s,]/g, '_')}`;
    const unique = options.unique ? 'UNIQUE' : '';
    const using = options.type ? `USING ${options.type}` : '';

    const sql = `CREATE ${unique} INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ${using} (${cols})`;
    console.log(`Adding index (if missing): ${indexName}`);
    await this.db.query(sql);
  }

  /**
   * Drop index from table
   * @param {string} indexName 
   */
  async dropIndex(indexName) {
    const sql = `DROP INDEX IF EXISTS "${indexName}"`;
    console.log(`Dropping index: ${indexName}`);
    await this.db.query(sql);
  }

  /**
   * Execute raw SQL
   * @param {string} sql 
   * @param {Array} params
   */
  async raw(sql, params = []) {
    console.log(`Executing raw SQL: ${sql.substring(0, 100)}...`);
    return await this.db.query(sql, params);
  }

  /**
   * Check if table exists
   * @param {string} tableName 
   */
  async tableExists(tableName) {
    const result = await this.db.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = $1
      )
    `, [tableName]);
    
    return result.rows[0].exists;
  }

  /**
   * Check if column exists in table
   * @param {string} tableName 
   * @param {string} columnName 
   */
  async columnExists(tableName, columnName) {
    const result = await this.db.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      )
    `, [tableName, columnName]);
    
    return result.rows[0].exists;
  }

  /**
   * Get migration info
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get timestamp from filename
   */
  static getTimestamp(filename) {
    const match = filename.match(/^(\d{14})/);
    return match ? match[1] : null;
  }

  /**
   * Get description from filename
   */
  static getDescription(filename) {
    return filename.replace(/^\d{14}_/, '').replace(/\.js$/, '');
  }
}
