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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredRefreshTokens = exports.revokeAllUserRefreshTokens = exports.revokeRefreshToken = exports.verifyRefreshToken = exports.saveRefreshToken = exports.hashRefreshToken = exports.generateRefreshToken = exports.validatePhone = exports.validateEmail = exports.validatePassword = exports.generateResetToken = exports.generateOTP = exports.verifyToken = exports.verifyScopedToken = exports.generateScopedToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};
exports.comparePassword = comparePassword;
// Generate proper JWT token for authentication
const generateToken = (userId, email) => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateToken = generateToken;
// Generate a short-lived, purpose-scoped token (not an auth token)
const generateScopedToken = (payload, expiresIn = '30m') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
exports.generateScopedToken = generateScopedToken;
// Verify a scoped token and return payload
const verifyScopedToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
exports.verifyScopedToken = verifyScopedToken;
// Verify JWT token and return decoded payload
const verifyToken = async (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    }
    catch {
        return null;
    }
};
exports.verifyToken = verifyToken;
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOTP = generateOTP;
const generateResetToken = () => {
    return (0, uuid_1.v4)();
};
exports.generateResetToken = generateResetToken;
const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
};
exports.validatePassword = validatePassword;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/[^0-9]/g, ''));
};
exports.validatePhone = validatePhone;
// Refresh token management
const crypto_1 = require("crypto");
const generateRefreshToken = () => {
    return (0, crypto_1.randomBytes)(32).toString('hex');
};
exports.generateRefreshToken = generateRefreshToken;
const hashRefreshToken = async (token) => {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
};
exports.hashRefreshToken = hashRefreshToken;
const saveRefreshToken = async (userId, accountType, tokenHash, expiresIn, deviceInfo, userAgent, ipAddress) => {
    try {
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const expiresAt = new Date(Date.now() + expiresIn);
        await pool.query(`INSERT INTO refresh_tokens
       (user_id, account_type, token_hash, expires_at, device_info, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [userId, accountType, tokenHash, expiresAt, deviceInfo, userAgent, ipAddress]);
        return true;
    }
    catch (error) {
        console.error('Error saving refresh token:', error);
        return false;
    }
};
exports.saveRefreshToken = saveRefreshToken;
const verifyRefreshToken = async (token, userId) => {
    try {
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const tokenHash = await (0, exports.hashRefreshToken)(token);
        let query = `
      SELECT rt.user_id, rt.account_type, rt.expires_at, rt.is_revoked
      FROM refresh_tokens rt
      WHERE rt.token_hash = $1
        AND rt.expires_at > NOW()
        AND rt.is_revoked = false
    `;
        const params = [tokenHash];
        if (userId) {
            query += ' AND rt.user_id = $2';
            params.push(userId);
        }
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return { valid: false, error: 'Invalid or expired refresh token' };
        }
        const refreshToken = result.rows[0];
        // Update last used timestamp
        await pool.query('UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = $1', [
            tokenHash,
        ]);
        return {
            valid: true,
            userId: refreshToken.user_id,
            accountType: refreshToken.account_type,
        };
    }
    catch (error) {
        console.error('Error verifying refresh token:', error);
        return { valid: false, error: 'Token verification failed' };
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
const revokeRefreshToken = async (token) => {
    try {
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const tokenHash = await (0, exports.hashRefreshToken)(token);
        const result = await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1', [tokenHash]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (error) {
        console.error('Error revoking refresh token:', error);
        return false;
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
const revokeAllUserRefreshTokens = async (userId) => {
    try {
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const result = await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1', [userId]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (error) {
        console.error('Error revoking all user refresh tokens:', error);
        return false;
    }
};
exports.revokeAllUserRefreshTokens = revokeAllUserRefreshTokens;
const cleanupExpiredRefreshTokens = async () => {
    try {
        const pool = (await Promise.resolve().then(() => __importStar(require('../config/database')))).default;
        const result = await pool.query('DELETE FROM refresh_tokens WHERE expires_at <= NOW() OR is_revoked = true');
        return result.rowCount ?? 0;
    }
    catch (error) {
        console.error('Error cleaning up expired refresh tokens:', error);
        return 0;
    }
};
exports.cleanupExpiredRefreshTokens = cleanupExpiredRefreshTokens;
