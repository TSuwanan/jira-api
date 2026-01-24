"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.jwtPlugin = void 0;
const elysia_1 = require("elysia");
const jwt_1 = require("@elysiajs/jwt");
exports.jwtPlugin = new elysia_1.Elysia().use((0, jwt_1.jwt)({
    name: "jwt",
    secret: process.env.JWT_SECRET || "your-secret-key",
}));
const authMiddleware = (app) => app.derive(async ({ jwt, headers, set }) => {
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
        user: payload,
    };
});
exports.authMiddleware = authMiddleware;
