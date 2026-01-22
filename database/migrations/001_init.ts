import { Pool } from "pg";

export async function up(pool: Pool) {
  console.log("Running migration: 001_init");
  
  // Enable UUID extension
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  console.log("✅ Enabled UUID extension");
  
  // Create roles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Created roles table");

  // Insert default roles
  await pool.query(`
    INSERT INTO roles (id, name) VALUES
    (1, 'admin'),
    (2, 'user')
    ON CONFLICT (name) DO NOTHING
  `);
  console.log("✅ Inserted default roles");
  
  // Create sequences for custom keys
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS user_code_seq START 1;
    CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;
    CREATE SEQUENCE IF NOT EXISTS task_code_seq START 1;
  `);
  console.log("✅ Created sequences");
  
    // Create users table
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('LCB' || LPAD(nextval('user_code_seq')::TEXT, 4, '0')),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role_id INTEGER DEFAULT 2 REFERENCES roles(id),
        position_code VARCHAR(100),
        level_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP DEFAULT NULL
    )
    `);

    // เพิ่ม comments แยก
    await pool.query(`
    COMMENT ON COLUMN users.position_code IS 'Position codes: DEV=Developer, QA=Quality Assurance, PM=Project Manager, DES=Designer';
    COMMENT ON COLUMN users.level_code IS 'Level codes: S=Senior, M=Middle, J=Junior, L=Lead';
    `);

    console.log("✅ Created users table");
    
  // Create projects table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('PJ' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD(nextval('project_code_seq')::TEXT, 3, '0')),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      owner_id UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP DEFAULT NULL
    )
  `);
  console.log("✅ Created projects table");
  
  // Create project_members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY(project_id, user_id)
    )
  `);
  console.log("✅ Created project_members table");
  
  // Create tasks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('TSK' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || LPAD(nextval('task_code_seq')::TEXT, 3, '0')),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'todo',
      priority VARCHAR(20) DEFAULT 'medium',
      assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id),
      due_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP DEFAULT NULL
    )
  `);
  console.log("✅ Created tasks table");
  
  // Create comments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Created comments table");
  
  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_user_code ON users(user_code);
    CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_task_code ON tasks(task_code);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
  `);
  console.log("✅ Created indexes");
  
  console.log("✅ Migration 001_init completed");
}

export async function down(pool: Pool) {
  console.log("Rolling back migration: 001_init");
  
  // Drop tables in reverse order (respecting foreign key constraints)
  await pool.query(`DROP TABLE IF EXISTS comments CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS tasks CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS project_members CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS projects CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
  await pool.query(`DROP TABLE IF EXISTS roles CASCADE`);
  
  // Drop sequences
  await pool.query(`DROP SEQUENCE IF EXISTS user_code_seq CASCADE`);
  await pool.query(`DROP SEQUENCE IF EXISTS project_code_seq CASCADE`);
  await pool.query(`DROP SEQUENCE IF EXISTS task_code_seq CASCADE`);
  
  await pool.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  
  console.log("✅ Rollback completed");
}