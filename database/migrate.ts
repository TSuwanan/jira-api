import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  console.log("🔄 Running migrations...");
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();
  
  for (const file of files) {
    const migrationName = file.replace(/\.(ts|js)$/, "");
    
    const result = await pool.query(
      "SELECT * FROM migrations WHERE name = $1",
      [migrationName]
    );
    
    if (result.rows.length > 0) {
      console.log(`⏭️  Skipping ${file} (already executed)`);
      continue;
    }
    
    console.log(`▶️  Running ${file}...`);
    
    const migration = await import(path.join(migrationsDir, file));
    await migration.up(pool);
    
    await pool.query(
      "INSERT INTO migrations (name) VALUES ($1)",
      [migrationName]
    );
    
    console.log(`✅ Completed ${file}`);
  }
  console.log("🎉 All migrations completed!");
}

runMigrations()
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });