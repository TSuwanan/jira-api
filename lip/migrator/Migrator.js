import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, basename, resolve } from 'path';
import { createHash } from 'crypto';

/**
 * Database Migrator
 * Manages database migrations and tracks execution state
 */
export class Migrator {
  constructor(config) {
    this.config = config;
    this.pool = new Pool(config.connection);
    this.migrationsDir = resolve(config.migrations?.directory || './database/migrations');
    this.migrationsTable = config.migrations?.tableName || '_migrations';
  }

  /**
   * Initialize the migrations table if it doesn't exist
   */
  async initMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS "${this.migrationsTable}" (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        batch INTEGER NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        checksum VARCHAR(64),
        status VARCHAR(20) DEFAULT 'success'
      )
    `;
    
    await this.pool.query(sql);
  }

  /**
   * Get all executed migrations from database
   */
  async getExecutedMigrations() {
    await this.initMigrationsTable();
    
    const result = await this.pool.query(
      `SELECT * FROM "${this.migrationsTable}" ORDER BY batch, id`
    );
    
    return result.rows;
  }

  /**
   * Get all migration files from directory
   */
  async getMigrationFiles() {
    try {
      const files = await readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.js'))
        .sort(); // Sort by filename (timestamp)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`Migration directory ${this.migrationsDir} not found`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Get pending migrations (not yet executed)
   */
  async getPendingMigrations() {
    const executed = await this.getExecutedMigrations();
    const allFiles = await this.getMigrationFiles();
    
    const executedFilenames = executed.map(m => m.filename);
    
    return allFiles.filter(file => !executedFilenames.includes(file));
  }

  /**
   * Calculate file checksum for integrity verification
   */
  async calculateChecksum(filepath) {
    const content = await readFile(filepath, 'utf8');
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Load and instantiate migration class
   */
  async loadMigration(filename) {
    const filepath = resolve(join(this.migrationsDir, filename));
    
    try {
      // Dynamic import the migration file
      const module = await import(`file://${filepath}`);
      const MigrationClass = module.default;
      
      if (!MigrationClass) {
        throw new Error(`Migration ${filename} does not have a default export`);
      }
      
      return new MigrationClass(this.pool);
    } catch (error) {
      console.error(`Failed to load migration ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(filename, direction = 'up') {
    console.log(`\n🔄 ${direction === 'up' ? 'Running' : 'Rolling back'} migration: ${filename}`);
    
    const startTime = Date.now();
    const filepath = resolve(join(this.migrationsDir, filename));
    const checksum = await this.calculateChecksum(filepath);
    
    try {
      // Load migration
      const migration = await this.loadMigration(filename);
      
      // Execute in transaction
      await this.pool.query('BEGIN');
      
      if (direction === 'up') {
        await migration.up(this.pool);
      } else {
        await migration.down(this.pool);
      }
      
      await this.pool.query('COMMIT');
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ Migration ${filename} ${direction === 'up' ? 'executed' : 'rolled back'} successfully (${executionTime}ms)`);
      
      return { success: true, executionTime, checksum };
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Migration ${filename} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Record migration execution in database
   */
  async recordMigration(filename, batch, executionTime, checksum, status = 'success') {
    await this.pool.query(
      `INSERT INTO "${this.migrationsTable}" 
       (filename, batch, execution_time_ms, checksum, status) 
       VALUES ($1, $2, $3, $4, $5)`,
      [filename, batch, executionTime, checksum, status]
    );
  }

  /**
   * Remove migration record from database
   */
  async removeMigrationRecord(filename) {
    await this.pool.query(
      `DELETE FROM "${this.migrationsTable}" WHERE filename = $1`,
      [filename]
    );
  }

  /**
   * Get next batch number
   */
  async getNextBatch() {
    const result = await this.pool.query(
      `SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM "${this.migrationsTable}"`
    );
    
    return result.rows[0].next_batch;
  }

  /**
   * Run all pending migrations
   */
  async migrate() {
    console.log('🚀 Starting database migration...\n');
    
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      console.log('✨ No pending migrations found. Database is up to date!');
      return { migrated: [], batch: null };
    }
    
    console.log(`Found ${pending.length} pending migration(s):`);
    pending.forEach(file => console.log(`  - ${file}`));
    
    const batch = await this.getNextBatch();
    const migrated = [];
    
    for (const filename of pending) {
      try {
        const result = await this.executeMigration(filename, 'up');
        await this.recordMigration(filename, batch, result.executionTime, result.checksum);
        migrated.push(filename);
      } catch (error) {
        // Record failed migration
        await this.recordMigration(filename, batch, 0, '', 'failed');
        console.error(`\n❌ Migration failed at: ${filename}`);
        console.error('Stopping migration process...');
        break;
      }
    }
    
    console.log(`\n🎉 Migration completed! ${migrated.length} migration(s) executed in batch ${batch}`);
    return { migrated, batch };
  }

  /**
   * Rollback the last batch of migrations
   */
  async rollback(steps = null) {
    console.log('🔙 Starting migration rollback...\n');
    
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      console.log('No migrations to rollback.');
      return { rolledBack: [] };
    }
    
    // Get migrations to rollback
    let toRollback;
    if (steps) {
      // Rollback specific number of migrations
      toRollback = executed.slice(-steps).reverse();
    } else {
      // Rollback last batch
      const lastBatch = Math.max(...executed.map(m => m.batch));
      toRollback = executed.filter(m => m.batch === lastBatch).reverse();
    }
    
    console.log(`Rolling back ${toRollback.length} migration(s):`);
    toRollback.forEach(migration => console.log(`  - ${migration.filename}`));
    
    const rolledBack = [];
    
    for (const migrationRecord of toRollback) {
      try {
        // Try to load migration; if missing, remove record and continue
        try {
          await this.loadMigration(migrationRecord.filename);
        } catch (loadErr) {
          console.warn(`⚠️  Missing migration file: ${migrationRecord.filename}. Removing record and continuing.`);
          await this.removeMigrationRecord(migrationRecord.filename);
          rolledBack.push(migrationRecord.filename);
          continue;
        }
        await this.executeMigration(migrationRecord.filename, 'down');
        await this.removeMigrationRecord(migrationRecord.filename);
        rolledBack.push(migrationRecord.filename);
      } catch (error) {
        console.error(`\n❌ Rollback failed at: ${migrationRecord.filename}`);
        console.error('Stopping rollback process...');
        break;
      }
    }
    
    console.log(`\n🎉 Rollback completed! ${rolledBack.length} migration(s) rolled back`);
    return { rolledBack };
  }

  /**
   * Reset all migrations (rollback everything)
   */
  async reset() {
    console.log('🗑️  Resetting all migrations...\n');
    
    const executed = await this.getExecutedMigrations();
    
    if (executed.length === 0) {
      console.log('No migrations to reset.');
      return { reset: [] };
    }
    
    // Rollback all migrations in reverse order
    const toReset = executed.reverse();
    const reset = [];
    
    for (const migrationRecord of toReset) {
      try {
        // Try to load migration; if missing, remove record and continue
        try {
          await this.loadMigration(migrationRecord.filename);
        } catch (loadErr) {
          console.warn(`⚠️  Missing migration file: ${migrationRecord.filename}. Removing record and continuing.`);
          await this.removeMigrationRecord(migrationRecord.filename);
          reset.push(migrationRecord.filename);
          continue;
        }
        await this.executeMigration(migrationRecord.filename, 'down');
        await this.removeMigrationRecord(migrationRecord.filename);
        reset.push(migrationRecord.filename);
      } catch (error) {
        console.error(`\n❌ Reset failed at: ${migrationRecord.filename}`);
        console.error('Stopping reset process...');
        break;
      }
    }
    
    console.log(`\n🎉 Reset completed! ${reset.length} migration(s) reset`);
    return { reset };
  }

  /**
   * Get migration status
   */
  async status() {
    const executed = await this.getExecutedMigrations();
    const allFiles = await this.getMigrationFiles();
    const pending = await this.getPendingMigrations();
    
    console.log('\n📊 Migration Status:');
    console.log('=' .repeat(80));
    
    if (executed.length === 0) {
      console.log('No migrations executed yet.');
    } else {
      console.log(`\n✅ Executed Migrations (${executed.length}):`);
      console.log('-'.repeat(80));
      executed.forEach(m => {
        const status = m.status === 'success' ? '✅' : '❌';
        console.log(`${status} ${m.filename} (batch: ${m.batch}, ${m.execution_time_ms}ms)`);
      });
    }
    
    if (pending.length > 0) {
      console.log(`\n⏳ Pending Migrations (${pending.length}):`);
      console.log('-'.repeat(80));
      pending.forEach(file => {
        console.log(`⏳ ${file}`);
      });
    } else {
      console.log('\n✨ All migrations are up to date!');
    }
    
    console.log('='.repeat(80));
    
    return { executed, pending, total: allFiles.length };
  }

  /**
   * Close database connection
   */
  async close() {
    await this.pool.end();
  }
}
