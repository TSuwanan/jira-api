import { Pool } from "pg";
import bcrypt from "bcryptjs";

export async function up(pool: Pool) {
  console.log("Running seed: 001_users_tasks");

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Create users (user_code จะถูก generate อัตโนมัติ)
  const usersResult = await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role_id) VALUES
    ('admin@example.com', $1, 'Admin User', 1),
    ('john@example.com', $2, 'John Doe', 2),
    ('jane@example.com', $2, 'Jane Smith', 2)
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role_id = EXCLUDED.role_id
    RETURNING id, user_code, email, full_name, role_id
  `, [adminPassword, userPassword]);
  
  console.log("✅ Created users:", usersResult.rows);

  const [admin, john, jane] = usersResult.rows;

  // Create projects (project_code จะถูก generate อัตโนมัติ)
  const projectsResult = await pool.query(`
    INSERT INTO projects (name, description, owner_id) VALUES
    ('Website Redesign', 'Redesign company website with modern UI', $1),
    ('Mobile App', 'Develop iOS and Android mobile application', $1),
    ('API Development', 'Build RESTful API for all services', $2)
    ON CONFLICT (project_code) DO NOTHING
    RETURNING id, project_code, name, owner_id
  `, [admin.id, john.id]);

  console.log("✅ Created projects:", projectsResult.rows);

  const [project1, project2, project3] = projectsResult.rows;

  // Add project members
  await pool.query(`
    INSERT INTO project_members (project_id, user_id) VALUES
    ($1, $2),
    ($1, $3),
    ($4, $2),
    ($4, $5),
    ($6, $3)
    ON CONFLICT (project_id, user_id) DO NOTHING
  `, [project1.id, john.id, jane.id, project2.id, jane.id, project3.id]);

  console.log("✅ Added project members");

  // Create tasks (task_code จะถูก generate อัตโนมัติ)
  const tasksResult = await pool.query(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date) VALUES
    ($1, 'Design homepage mockup', 'Create wireframes and mockups for new homepage', 'in_progress', 'high', $2, $3, CURRENT_DATE + INTERVAL '7 days'),
    ($1, 'Setup development environment', 'Configure local dev environment for the project', 'done', 'medium', $2, $3, CURRENT_DATE - INTERVAL '2 days'),
    ($1, 'Review color palette', 'Review and approve new brand colors', 'todo', 'low', $4, $3, CURRENT_DATE + INTERVAL '14 days'),
    ($5, 'Design app icon', 'Create app icon for iOS and Android', 'todo', 'high', $4, $3, CURRENT_DATE + INTERVAL '5 days'),
    ($5, 'Setup CI/CD pipeline', 'Configure automated testing and deployment', 'in_progress', 'high', $2, $6, CURRENT_DATE + INTERVAL '3 days'),
    ($7, 'Define API endpoints', 'Document all required API endpoints', 'done', 'high', $2, $6, CURRENT_DATE - INTERVAL '5 days'),
    ($7, 'Implement authentication', 'Add JWT authentication to API', 'in_progress', 'high', $2, $6, CURRENT_DATE + INTERVAL '2 days')
    RETURNING id, task_code, title, status
  `, [project1.id, john.id, admin.id, jane.id, project2.id, john.id, project3.id]);

  console.log("✅ Created tasks:", tasksResult.rows);

  // Create comments
  await pool.query(`
    INSERT INTO comments (task_id, user_id, content) VALUES
    ((SELECT id FROM tasks WHERE title = 'Design homepage mockup'), $1, 'Looking great so far! Can we add more whitespace?'),
    ((SELECT id FROM tasks WHERE title = 'Design homepage mockup'), $2, 'Sure, I will update the mockup today.'),
    ((SELECT id FROM tasks WHERE title = 'Setup CI/CD pipeline'), $3, 'Which CI/CD tool should we use?'),
    ((SELECT id FROM tasks WHERE title = 'Setup CI/CD pipeline'), $4, 'Let''s go with GitHub Actions for now.')
  `, [admin.id, jane.id, jane.id, john.id]);

  console.log("✅ Created comments");
  console.log("✅ Seed 001_users_tasks completed");
}

export async function down(pool: Pool) {
  console.log("Rolling back seed: 001_users_tasks");
  
  await pool.query(`DELETE FROM comments`);
  await pool.query(`DELETE FROM tasks`);
  await pool.query(`DELETE FROM project_members`);
  await pool.query(`DELETE FROM projects`);
  await pool.query(`DELETE FROM users WHERE email LIKE '%@example.com'`);
  
  console.log("✅ Seed rollback completed");
}