import { Pool } from 'pg';
import { readdir } from 'fs/promises';
import { join, basename, resolve } from 'path';

/**
 * Seeder Manager
 * Manages database seeders with dependency resolution
 */
export class SeederManager {
  constructor(config) {
    this.config = config;
    this.pool = new Pool(config.connection);
    this.seedersDir = config.seeds?.directory || './database/seeders';
    this.seedersTable = config.seeds?.tableName || '_seeders';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Initialize the seeders tracking table
   */
  async initSeedersTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS "${this.seedersTable}" (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        environment VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'success'
      )
    `;
    
    await this.pool.query(sql);
  }

  /**
   * Get all executed seeders from database
   */
  async getExecutedSeeders(environment = null) {
    await this.initSeedersTable();
    
    let sql = `SELECT * FROM "${this.seedersTable}"`;
    let params = [];
    
    if (environment) {
      sql += ` WHERE environment = $1`;
      params = [environment];
    }
    
    sql += ` ORDER BY id`;
    
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get all seeder files from directory
   */
  async getSeederFiles() {
    try {
      const files = await readdir(this.seedersDir);
      return files
        .filter(file => file.endsWith('.js'))
        .sort(); // Sort by filename (timestamp)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`Seeders directory ${this.seedersDir} not found`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Load and instantiate seeder class
   */
  async loadSeeder(filename) {
    const filepath = resolve(join(this.seedersDir, filename));
    
    try {
      const module = await import(`file://${filepath}`);
      const SeederClass = module.default;
      
      if (!SeederClass) {
        throw new Error(`Seeder ${filename} does not have a default export`);
      }
      
      return new SeederClass(this.pool);
    } catch (error) {
      console.error(`Failed to load seeder ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Resolve seeder dependencies using topological sort
   */
  async resolveDependencies(seederFiles) {
    const seeders = new Map();
    const dependencies = new Map();
    const classToFile = new Map();
    
    // Load all seeders to get their dependencies and class names
    for (const filename of seederFiles) {
      const seeder = await this.loadSeeder(filename);
      const seederName = basename(filename, '.js');
      const className = seeder.constructor.name;
      
      seeders.set(seederName, filename);
      classToFile.set(className, seederName);
      dependencies.set(seederName, seeder.getDependencies());
    }
    
    // Topological sort
    const sorted = [];
    const visiting = new Set();
    const visited = new Set();
    
    const visit = (seederName) => {
      if (visited.has(seederName)) return;
      if (visiting.has(seederName)) {
        throw new Error(`Circular dependency detected involving ${seederName}`);
      }
      
      visiting.add(seederName);
      
      const deps = dependencies.get(seederName) || [];
      for (const dep of deps) {
        // Convert class name to seeder name if needed
        const depSeederName = classToFile.has(dep) ? classToFile.get(dep) : dep;
        
        if (!seeders.has(depSeederName)) {
          throw new Error(`Dependency ${dep} not found for seeder ${seederName}`);
        }
        visit(depSeederName);
      }
      
      visiting.delete(seederName);
      visited.add(seederName);
      sorted.push(seeders.get(seederName));
    };
    
    for (const seederName of seeders.keys()) {
      visit(seederName);
    }
    
    return sorted;
  }

  /**
   * Execute a single seeder
   */
  async executeSeeder(filename) {
    console.log(`🌱 Running seeder: ${filename}`);
    
    try {
      const seeder = await this.loadSeeder(filename);
      
      // Check if seeder should run in current environment
      const seederName = seeder.getName();
      
      // Execute seeder in transaction
      await this.pool.query('BEGIN');
      await seeder.run(this.pool);
      await this.pool.query('COMMIT');
      
      console.log(`✅ Seeder ${filename} executed successfully`);
      
      return { success: true };
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Seeder ${filename} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Record seeder execution in database
   */
  async recordSeeder(filename, status = 'success') {
    await this.pool.query(
      `INSERT INTO "${this.seedersTable}" (filename, environment, status) VALUES ($1, $2, $3)
       ON CONFLICT (filename) DO UPDATE SET 
         executed_at = CURRENT_TIMESTAMP,
         environment = $2,
         status = $3`,
      [filename, this.environment, status]
    );
  }

  /**
   * Check if seeder has been executed
   */
  async isSeederExecuted(filename) {
    const result = await this.pool.query(
      `SELECT EXISTS(SELECT 1 FROM "${this.seedersTable}" 
       WHERE filename = $1 AND status = 'success')`,
      [filename]
    );
    
    return result.rows[0].exists;
  }

  /**
   * Run all seeders or specific seeders
   */
  async seed(options = {}) {
    console.log('🌱 Starting database seeding...\n');
    
    const allFiles = await this.getSeederFiles();
    
    if (allFiles.length === 0) {
      console.log('No seeders found.');
      return { seeded: [] };
    }
    
    // Filter seeders to run
    let seedersToRun = allFiles;
    
    if (options.class) {
      // Run specific seeder class
      const seederFile = allFiles.find(file => 
        basename(file, '.js').includes(options.class) ||
        file.includes(options.class)
      );
      
      if (!seederFile) {
        throw new Error(`Seeder ${options.class} not found`);
      }
      
      seedersToRun = [seederFile];
    } else if (!options.fresh) {
      // Exclude already executed seeders (unless --fresh flag is used)
      const executed = await this.getExecutedSeeders();
      const executedFilenames = executed.map(s => s.filename);
      
      seedersToRun = allFiles.filter(file => !executedFilenames.includes(file));
    }
    
    if (seedersToRun.length === 0) {
      console.log('✨ All seeders have been executed. Database is up to date!');
      return { seeded: [] };
    }
    
    // Resolve dependencies
    let orderedSeeders;
    try {
      orderedSeeders = await this.resolveDependencies(seedersToRun);
    } catch (error) {
      console.error('❌ Failed to resolve seeder dependencies:', error.message);
      throw error;
    }
    
    console.log(`Found ${orderedSeeders.length} seeder(s) to run:`);
    orderedSeeders.forEach(file => console.log(`  - ${file}`));
    console.log('');
    
    const seeded = [];
    
    for (const filename of orderedSeeders) {
      try {
        await this.executeSeeder(filename);
        await this.recordSeeder(filename, 'success');
        seeded.push(filename);
      } catch (error) {
        // Record failed seeder
        await this.recordSeeder(filename, 'failed');
        console.error(`\n❌ Seeding failed at: ${filename}`);
        console.error('Stopping seeding process...');
        throw error;
      }
    }
    
    console.log(`\n🎉 Seeding completed! ${seeded.length} seeder(s) executed`);
    return { seeded };
  }

  /**
   * Reset seeders (clear seeder records)
   */
  async resetSeeders(environment = null) {
    console.log('🗑️  Resetting seeder records...\n');
    
    let sql = `DELETE FROM "${this.seedersTable}"`;
    let params = [];
    
    if (environment) {
      sql += ` WHERE environment = $1`;
      params = [environment];
    }
    
    const result = await this.pool.query(sql, params);
    
    console.log(`✅ ${result.rowCount} seeder record(s) cleared`);
    return { cleared: result.rowCount };
  }

  /**
   * Get seeding status
   */
  async status() {
    const allFiles = await this.getSeederFiles();
    const executed = await this.getExecutedSeeders();
    const executedFilenames = executed.map(s => s.filename);
    const pending = allFiles.filter(f => !executedFilenames.includes(f));
    
    console.log('\n🌱 Seeding Status:');
    console.log('=' .repeat(80));
    
    if (executed.length === 0) {
      console.log('No seeders executed yet.');
    } else {
      console.log(`\n✅ Executed Seeders (${executed.length}):`);
      console.log('-'.repeat(80));
      executed.forEach(s => {
        const status = s.status === 'success' ? '✅' : '❌';
        console.log(`${status} ${s.filename} (${s.environment}, ${s.executed_at})`);
      });
    }
    
    if (pending.length > 0) {
      console.log(`\n⏳ Pending Seeders (${pending.length}):`);
      console.log('-'.repeat(80));
      pending.forEach(file => {
        console.log(`⏳ ${file}`);
      });
    } else {
      console.log('\n✨ All seeders are up to date!');
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