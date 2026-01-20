/**
 * Schema Builder Class
 * Provides a fluent interface for building database schema SQL
 */
export class SchemaBuilder {
  constructor(tableName, operation = 'create') {
    this.tableName = tableName;
    this.operation = operation; // 'create', 'alter'
    this.columns = [];
    this.indexes = [];
    this.foreignKeys = [];
    this.constraints = [];
    this.options = {};
  }

  /**
   * Add a UUID column (PostgreSQL specific)
   * @param {string} name - Column name
   */
  uuid(name = 'id') {
    const column = new ColumnBuilder(name, 'UUID');
    this.columns.push(column);
    return column;
  }

  /**
   * Add an integer column
   * @param {string} name - Column name
   */
  integer(name) {
    const column = new ColumnBuilder(name, 'INTEGER');
    this.columns.push(column);
    return column;
  }

  /**
   * Add a serial column (auto-incrementing integer)
   * @param {string} name - Column name
   */
  serial(name = 'id') {
    const column = new ColumnBuilder(name, 'SERIAL');
    this.columns.push(column);
    return column;
  }

  /**
   * Add a string column
   * @param {string} name - Column name
   * @param {number} length - Maximum length
   */
  string(name, length = 255) {
    const column = new ColumnBuilder(name, `VARCHAR(${length})`);
    this.columns.push(column);
    return column;
  }

  /**
   * Add a text column
   * @param {string} name - Column name
   */
  text(name) {
    const column = new ColumnBuilder(name, 'TEXT');
    this.columns.push(column);
    return column;
  }

  /**
   * Add a boolean column
   * @param {string} name - Column name
   */
  boolean(name) {
    const column = new ColumnBuilder(name, 'BOOLEAN');
    this.columns.push(column);
    return column;
  }

  /**
   * Add a timestamp column
   * @param {string} name - Column name
   */
  timestamp(name) {
    const column = new ColumnBuilder(name, 'TIMESTAMP');
    this.columns.push(column);
    return column;
  }

  /**
   * Add created_at and updated_at timestamp columns
   */
  timestamps() {
    // Use NOW() so ColumnBuilder treats it as a function (no quotes)
    this.timestamp('created_at').default('NOW()');
    this.timestamp('updated_at').default('NOW()');
    return this;
  }

  /**
   * Add a decimal column
   * @param {string} name - Column name
   * @param {number} precision - Total digits
   * @param {number} scale - Decimal digits
   */
  decimal(name, precision = 8, scale = 2) {
    const column = new ColumnBuilder(name, `DECIMAL(${precision},${scale})`);
    this.columns.push(column);
    return column;
  }

  /**
   * Add a JSON column (PostgreSQL specific)
   * @param {string} name - Column name
   */
  json(name) {
    const column = new ColumnBuilder(name, 'JSON');
    this.columns.push(column);
    return column;
  }

  /**
   * Add a JSONB column (PostgreSQL specific)
   * @param {string} name - Column name
   */
  jsonb(name) {
    const column = new ColumnBuilder(name, 'JSONB');
    this.columns.push(column);
    return column;
  }

  /**
   * Add an index
   * @param {string|Array} columns - Column name(s)
   * @param {Object} options - Index options
   */
  index(columns, options = {}) {
    const cols = Array.isArray(columns) ? columns : [columns];
    const indexName = options.name || `idx_${this.tableName}_${cols.join('_')}`;
    
    this.indexes.push({
      name: indexName,
      columns: cols,
      unique: options.unique || false,
      type: options.type || 'btree'
    });
    
    return this;
  }

  /**
   * Add a unique index
   * @param {string|Array} columns - Column name(s)
   * @param {Object} options - Index options
   */
  unique(columns, options = {}) {
    return this.index(columns, { ...options, unique: true });
  }

  /**
   * Add a foreign key constraint
   * @param {string} column - Local column name
   * @param {string} references - Referenced table.column
   * @param {Object} options - Foreign key options
   */
  foreign(column, references, options = {}) {
    const [refTable, refColumn] = references.split('.');
    
    this.foreignKeys.push({
      column,
      refTable,
      refColumn,
      onDelete: options.onDelete || 'RESTRICT',
      onUpdate: options.onUpdate || 'CASCADE'
    });
    
    return this;
  }

  /**
   * Add a check constraint
   * @param {string} name - Constraint name
   * @param {string} expression - Check expression
   */
  check(name, expression) {
    this.constraints.push({
      type: 'CHECK',
      name: `chk_${this.tableName}_${name}`,
      expression
    });
    
    return this;
  }

  /**
   * Generate CREATE TABLE SQL
   */
  toCreateSQL() {
    let sql = `CREATE TABLE IF NOT EXISTS "${this.tableName}" (\n`;
    
    // Add columns
    const columnDefs = this.columns.map(col => `  ${col.toSQL()}`);
    sql += columnDefs.join(',\n');
    
    // Add foreign keys
    if (this.foreignKeys.length > 0) {
      const fkDefs = this.foreignKeys.map(fk => 
        `  CONSTRAINT fk_${this.tableName}_${fk.column} FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`
      );
      sql += ',\n' + fkDefs.join(',\n');
    }
    
    // Add constraints
    if (this.constraints.length > 0) {
      const constraintDefs = this.constraints.map(c => `  CONSTRAINT ${c.name} ${c.type} (${c.expression})`);
      sql += ',\n' + constraintDefs.join(',\n');
    }
    
    sql += '\n)';
    
    return sql;
  }

  /**
   * Generate index SQL statements
   */
  toIndexSQL() {
    return this.indexes.map(idx => {
      const unique = idx.unique ? 'UNIQUE ' : '';
      const columns = idx.columns.join(', ');
      return `CREATE ${unique}INDEX "${idx.name}" ON "${this.tableName}" USING ${idx.type} (${columns})`;
    });
  }

  /**
   * Add raw SQL to column definition
   * @param {string} sql - Raw SQL to add
   */
  raw(sql) {
    const column = new ColumnBuilder(null, null);
    column.rawSql = sql;
    this.columns.push(column);
    return this;
  }

  /**
   * Generate the complete SQL for this schema
   */
  toSQL() {
    if (this.operation === 'create') {
      const createSQL = this.toCreateSQL();
      const indexSQL = this.toIndexSQL();
      return [createSQL, ...indexSQL].join(';\n') + ';';
    }
    
    // For ALTER operations, we'd need to implement alter logic
    throw new Error('ALTER operations not yet implemented');
  }
}

/**
 * Column Builder Class
 * Represents a single column definition
 */
class ColumnBuilder {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.nullable = true;
    this.defaultValue = null;
    this.isPrimary = false;
    this.isUnique = false;
    this.isAutoIncrement = false;
  }

  /**
   * Make column primary key
   */
  primary() {
    this.isPrimary = true;
    this.nullable = false;
    return this;
  }

  /**
   * Make column not nullable
   */
  notNull() {
    this.nullable = false;
    return this;
  }

  /**
   * Make column nullable (default)
   */
  null() {
    this.nullable = true;
    return this;
  }

  /**
   * Add default value
   * @param {any} value - Default value
   */
  default(value) {
    if (value === null) {
      this.defaultValue = 'NULL';
    } else if (typeof value === 'string' && value.includes('()')) {
      // Function calls like NOW() or gen_random_uuid()
      this.defaultValue = value;
    } else if (typeof value === 'string') {
      this.defaultValue = `'${value}'`;
    } else {
      this.defaultValue = value;
    }
    return this;
  }

  /**
   * Make column unique
   */
  unique() {
    this.isUnique = true;
    return this;
  }

  /**
   * Generate SQL for this column
   */
  toSQL() {
    // Handle raw SQL
    if (this.rawSql) {
      return this.rawSql;
    }
    
    let sql = `"${this.name}" ${this.type}`;
    
    if (this.isPrimary) {
      sql += ' PRIMARY KEY';
    }
    
    if (!this.nullable) {
      sql += ' NOT NULL';
    }
    
    if (this.defaultValue !== null) {
      sql += ` DEFAULT ${this.defaultValue}`;
    }
    
    if (this.isUnique && !this.isPrimary) {
      sql += ' UNIQUE';
    }
    
    return sql;
  }
}
