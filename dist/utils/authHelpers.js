"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminAccount = exports.requireMemberAccount = exports.requireAuth = exports.authMiddleware = void 0;
const database_1 = __importDefault(require("../config/database"));
const jwt = __importStar(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
/**
 * Authentication middleware for Elysia routes
 * Returns user object if authenticated, null otherwise
 */
const authMiddleware = async ({ headers }) => {
    const authHeader = headers.authorization || headers['Authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return { user: null };
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Try admin users table first
        let result = await database_1.default.query("SELECT id, email, 'admin' as account_type FROM users WHERE id = $1", [decoded.userId]);
        if (result.rows.length === 0) {
            return { user: null };
        }
        const user = result.rows[0];
        return { user };
    }
    catch {
        return { user: null };
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Require authentication - sets 401 if no user
 * Note: This doesn't throw, just marks the response as unauthorized
 * Controllers must still check for user
 */
const requireAuth = () => {
    return {};
};
exports.requireAuth = requireAuth;
/**
 * Require member account type
 */
const requireMemberAccount = ({ user, set }) => {
    if (user?.account_type !== 'member') {
        set.status = 403;
        throw new Error('Member access required');
    }
    return {};
};
exports.requireMemberAccount = requireMemberAccount;
/**
 * Require admin account type
 */
const requireAdminAccount = ({ user, set }) => {
    if (user?.account_type !== 'admin') {
        set.status = 403;
        throw new Error('Admin access required');
    }
    return {};
};
exports.requireAdminAccount = requireAdminAccount;
