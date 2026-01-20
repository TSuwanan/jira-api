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
      INSERT INTO roles (id, name)
      VALUES (1,'ADMIN'), (2,'MEMBER')
      ON CONFLICT DO NOTHING;
    `);

        console.log('roles seeded');
    } catch (err) {
        console.error('seed failed', err);
    } finally {
        await pool.end();
    }
}

seed();
