import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";

export const jwtPlugin = new Elysia().use(
  jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET || "your-secret-key",
  })
);

export const authMiddleware = (app: any) =>
  app.derive(async ({ jwt, headers, set }: any) => {
    const authorization = headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("Unauthorized - No token provided");
    }

    const token = authorization.split(" ")[1];
    const payload = await jwt.verify(token);

    if (!payload) {
      set.status = 401;
      throw new Error("Unauthorized - Invalid token");
    }

    return {
      user: payload as { id: string; email: string; role_id: number },
    };
  });