import { Elysia } from "elysia";
import { Pool } from "pg";
import { jwt } from "@elysiajs/jwt";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "secret-key-change-this",
    })
  )
  .get("/", () => ({ message: "Welcome to Jira Mini API" }))
  
  .post("/auth/login", async ({ body, jwt }) => {
    const { email, password } = body as any;
    
    const result = await pool.query(
      "SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = $1",
      [email]
    );
    
    if (result.rows.length === 0) {
      return { error: "User not found" };
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return { error: "Invalid password" };
    }
    
    const token = await jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role_name,
    });
    
    return { 
      token, 
      user: { 
        id: user.id, 
        email: user.email,
        full_name: user.full_name,
        role: user.role_name
      } 
    };
  })
  
  .listen(8000);

console.log(`🦊 Elysia is running at localhost:${app.server?.port}`); 