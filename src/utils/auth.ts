import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

export interface AuthUser {
  id: string
  email: string
  role?: string
  account_type?: 'admin' | 'member'
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// Generate proper JWT token for authentication
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

// Generate a short-lived, purpose-scoped token (not an auth token)
export const generateScopedToken = (
  payload: object,
  expiresIn: string | number = '30m',
): string => {
  return jwt.sign(payload as jwt.JwtPayload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

// Verify a scoped token and return payload
export const verifyScopedToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET)
}

// Verify JWT token and return decoded payload
export const verifyToken = async (
  token: string,
): Promise<{ userId: string; email: string } | null> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
    return decoded
  } catch {
    return null
  }
}

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const generateResetToken = (): string => {
  return uuidv4()
}

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10}$/
  return phoneRegex.test(phone.replace(/[^0-9]/g, ''))
}

// Refresh token management
import { randomBytes, createHash } from 'crypto'

export const generateRefreshToken = (): string => {
  return randomBytes(32).toString('hex')
}

export const hashRefreshToken = async (token: string): Promise<string> => {
  return createHash('sha256').update(token).digest('hex')
}

export const saveRefreshToken = async (
  userId: string,
  accountType: 'admin' | 'member',
  tokenHash: string,
  expiresIn: number,
  deviceInfo?: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<boolean> => {
  try {
    const pool = (await import('../config/database')).default
    const expiresAt = new Date(Date.now() + expiresIn)

    await pool.query(
      `INSERT INTO refresh_tokens
       (user_id, account_type, token_hash, expires_at, device_info, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, accountType, tokenHash, expiresAt, deviceInfo, userAgent, ipAddress],
    )

    return true
  } catch (error) {
    console.error('Error saving refresh token:', error)
    return false
  }
}

export const verifyRefreshToken = async (
  token: string,
  userId?: string,
): Promise<{
  valid: boolean
  userId?: string
  accountType?: string
  error?: string
}> => {
  try {
    const pool = (await import('../config/database')).default
    const tokenHash = await hashRefreshToken(token)

    let query = `
      SELECT rt.user_id, rt.account_type, rt.expires_at, rt.is_revoked
      FROM refresh_tokens rt
      WHERE rt.token_hash = $1
        AND rt.expires_at > NOW()
        AND rt.is_revoked = false
    `

    const params = [tokenHash]

    if (userId) {
      query += ' AND rt.user_id = $2'
      params.push(userId)
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid or expired refresh token' }
    }

    const refreshToken = result.rows[0]

    // Update last used timestamp
    await pool.query('UPDATE refresh_tokens SET last_used_at = NOW() WHERE token_hash = $1', [
      tokenHash,
    ])

    return {
      valid: true,
      userId: refreshToken.user_id,
      accountType: refreshToken.account_type,
    }
  } catch (error) {
    console.error('Error verifying refresh token:', error)
    return { valid: false, error: 'Token verification failed' }
  }
}

export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    const pool = (await import('../config/database')).default
    const tokenHash = await hashRefreshToken(token)

    const result = await pool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1',
      [tokenHash],
    )

    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error revoking refresh token:', error)
    return false
  }
}

export const revokeAllUserRefreshTokens = async (userId: string): Promise<boolean> => {
  try {
    const pool = (await import('../config/database')).default

    const result = await pool.query(
      'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1',
      [userId],
    )

    return (result.rowCount ?? 0) > 0
  } catch (error) {
    console.error('Error revoking all user refresh tokens:', error)
    return false
  }
}

export const cleanupExpiredRefreshTokens = async (): Promise<number> => {
  try {
    const pool = (await import('../config/database')).default

    const result = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at <= NOW() OR is_revoked = true',
    )

    return result.rowCount ?? 0
  } catch (error) {
    console.error('Error cleaning up expired refresh tokens:', error)
    return 0
  }
}
