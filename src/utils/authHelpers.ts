import pool from '../config/database'
import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret'

export interface AuthUser {
  id: string
  email: string
  role?: string
  account_type?: 'admin' | 'member'
}

/**
 * Authentication middleware for Elysia routes
 * Returns user object if authenticated, null otherwise
 */
export const authMiddleware = async ({ headers }: any) => {
  const authHeader = headers.authorization || headers['Authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Try admin users table first
    let result = await pool.query(
      "SELECT id, email, 'admin' as account_type FROM users WHERE id = $1",
      [decoded.userId],
    )


    if (result.rows.length === 0) {
      return { user: null }
    }

    const user = result.rows[0] as AuthUser
    return { user }
  } catch {
    return { user: null }
  }
}

/**
 * Require authentication - sets 401 if no user
 * Note: This doesn't throw, just marks the response as unauthorized
 * Controllers must still check for user
 */
export const requireAuth = () => {
  return {}
}

/**
 * Require member account type
 */
export const requireMemberAccount = ({ user, set }: any) => {
  if (user?.account_type !== 'member') {
    set.status = 403
    throw new Error('Member access required')
  }
  return {}
}

/**
 * Require admin account type
 */
export const requireAdminAccount = ({ user, set }: any) => {
  if (user?.account_type !== 'admin') {
    set.status = 403
    throw new Error('Admin access required')
  }
  return {}
}
