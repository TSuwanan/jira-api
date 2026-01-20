import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function seed() {
    try {
        await pool.query(`
        CREATE TABLE "public"."roles" (
        "id" int4 NOT NULL,
        "name" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY ("id")
        );
    `);

        console.log('roles seeded');
    } catch (err) {
        console.error('seed failed', err);
    } finally {
        await pool.end();
    }
}

seed();


