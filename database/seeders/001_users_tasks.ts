import { Pool } from "pg";
import bcrypt from "bcryptjs";

export async function up(pool: Pool) {
  console.log("Running seed: 001_users_tasks");

  // เช็คทุก table ก่อนรัน seed
  const usersCount = await pool.query(`SELECT COUNT(*) as count FROM users`);
  const projectsCount = await pool.query(`SELECT COUNT(*) as count FROM projects`);
  const tasksCount = await pool.query(`SELECT COUNT(*) as count FROM tasks`);
  const commentsCount = await pool.query(`SELECT COUNT(*) as count FROM comments`);

  // ถ้า table ใดมีข้อมูลแล้ว ให้ข้าม seed
  if (
    parseInt(usersCount.rows[0].count) > 0 ||
    parseInt(projectsCount.rows[0].count) > 0 ||
    parseInt(tasksCount.rows[0].count) > 0 ||
    parseInt(commentsCount.rows[0].count) > 0
  ) {
    console.log("⏭️  Skipping seed (data already exists in one or more tables)");
    console.log(`   - Users: ${usersCount.rows[0].count}`);
    console.log(`   - Projects: ${projectsCount.rows[0].count}`);
    console.log(`   - Tasks: ${tasksCount.rows[0].count}`);
    console.log(`   - Comments: ${commentsCount.rows[0].count}`);
    return;
  }

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Create users (user_code จะถูก generate อัตโนมัติ)
  const usersResult = await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role_id, position_code, level_code) VALUES
    ('admin@example.com', $1, 'เอมิลี่ คูเปอร์', 1, 'DEV', 'S'),
    ('mintra@example.com', $2, 'มินตรา ใจดี', 2, 'DEV', 'M'),
    ('ninna@example.com', $2, 'นินา พูนสุข', 2, 'QA', 'M')
    RETURNING id, user_code, email, full_name, role_id, position_code, level_code
  `, [adminPassword, userPassword]);
  
  console.log("✅ Created users:", usersResult.rows);

  const [admin, mintra, ninna] = usersResult.rows;

  // Create projects (project_code จะถูก generate อัตโนมัติ)
  const projectsResult = await pool.query(`
    INSERT INTO projects (name, description, owner_id, task_count) VALUES
    ('Website Redesign', 'Redesign company website with modern UI', $1, 3),
    ('Mobile App', 'Develop iOS and Android mobile application', $1, 2),
    ('API Development', 'Build RESTful API for all services', $1, 2)
    RETURNING id, project_code, name, owner_id, task_count
  `, [admin.id]);

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
  `, [project1.id, ninna.id, mintra.id, project2.id, mintra.id, project3.id]);

  console.log("✅ Added project members");

  // Create tasks (task_code จะถูก generate อัตโนมัติ)
  const tasksResult = await pool.query(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date) VALUES
    ($1, 'Design homepage mockup', 'Create wireframes and mockups for new homepage', 'I', 'H', $2, $3, CURRENT_DATE + INTERVAL '7 days'),
    ($1, 'Setup development environment', 'Configure local dev environment for the project', 'I', 'M', $2, $3, CURRENT_DATE - INTERVAL '2 days'),
    ($1, 'Review color palette', 'Review and approve new brand colors', 'I', 'L', $4, $3, CURRENT_DATE + INTERVAL '14 days'),
    ($5, 'Design app icon', 'Create app icon for iOS and Android', 'I', 'H', $4, $3, CURRENT_DATE + INTERVAL '5 days'),
    ($5, 'Setup CI/CD pipeline', 'Configure automated testing and deployment', 'I', 'H', $2, $6, CURRENT_DATE + INTERVAL '3 days'),
    ($7, 'Define API endpoints', 'Document all required API endpoints', 'I', 'H', $2, $6, CURRENT_DATE - INTERVAL '5 days'),
    ($7, 'Implement authentication', 'Add JWT authentication to API', 'I', 'H', $2, $6, CURRENT_DATE + INTERVAL '2 days')
    RETURNING id, task_code, title, status
  `, [project1.id, mintra.id, admin.id, ninna.id, project2.id, mintra.id, project3.id]);

  console.log("✅ Created tasks:", tasksResult.rows);

}

export async function down(pool: Pool) {
  console.log("Rolling back seed: 001_users_tasks");
  
  await pool.query(`DELETE FROM tasks`);
  await pool.query(`DELETE FROM project_members`);
  await pool.query(`DELETE FROM projects`);
  await pool.query(`DELETE FROM users`);
  
  console.log("✅ Seed rollback completed");
}