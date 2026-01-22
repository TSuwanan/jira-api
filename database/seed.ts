import { Pool } from "pg";
import fs from "fs/promises";
import path from "path";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runSeeds() {
  console.log("🌱 Running seeds...");

  const seedersDir = path.join(process.cwd(), "database", "seeders");

  try {
    const files = (await fs.readdir(seedersDir))
      .filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
      .sort();

    for (const file of files) {
      console.log(`▶️  Running ${file}...`);
      const seeder = await import(path.join(seedersDir, file));
      await seeder.up(pool);
      console.log(`✅ Completed ${file}`);
    }

    console.log("🎉 All seeds completed!");
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.log("No seeders directory found");
    } else {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runSeeds();