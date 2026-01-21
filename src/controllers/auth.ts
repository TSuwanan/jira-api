import pool from '../config/database'
import {
    loginSchema
} from '../schemas/auth'
import {
    comparePassword,
    generateRefreshToken,
    generateScopedToken,
    generateToken,
    hashRefreshToken,
    saveRefreshToken
} from '../utils/auth'





// FR-005: ระบบรักษาความปลอดภัย - Login (Updated to send OTP after email/password validation)
export const login = async ({ body, request, set }: any) => {
  try {
    const validatedData = loginSchema.parse(body)

    const { email, password } = validatedData

    // First check members table (regular users)
    let result = await pool.query(
      "SELECT id, email, username, password_hash, name, last_name, profile_name, phone_number, is_email_confirmed, is_sms_verified, (deleted_at IS NOT NULL) as is_deleted, is_blacklist, 'member' as user_type FROM members WHERE email = $1 AND deleted_at IS NULL",
      [email],
    )

    // If not found in members, check users table (admin/staff users)
    if (result.rows.length === 0) {
      result = await pool.query(
        "SELECT id, email, NULL as username, password, NULL as password_hash, name, lastname as last_name, NULL as profile_name, NULL as phone_number, is_email_confirmed, is_sms_verify as is_sms_verified, NOT is_active as is_deleted, false as is_blacklist, 'admin' as user_type FROM users WHERE email = $1 AND is_active = true",
        [email],
      )
    }

    if (result.rows.length === 0) {
      set.status = 401
      return { error: 'Invalid email or password' }
    }

    const user = result.rows[0]

    // Check if user is blacklisted (only for members)
    if (user.user_type === 'member' && user.is_blacklist) {
      set.status = 403
      return { error: 'Account has been suspended' }
    }

    // Verify password (use appropriate password field based on user type)
    const passwordHash = user.user_type === 'admin' ? user.password : user.password_hash
    const isPasswordValid = await comparePassword(password, passwordHash)
    if (!isPasswordValid) {
      set.status = 401
      return { error: 'Invalid email or password' }
    }

    // For admin users, directly login without OTP (as they don't have phone numbers in the old system)
    if (user.user_type === 'admin') {
      // Generate JWT token - should use Elysia JWT context in updated routes
      const token = generateToken(user.id, user.email)

      // Generate refresh token
      const refreshToken = generateRefreshToken()
      const refreshTokenHash = await hashRefreshToken(refreshToken)

      // Save refresh token
      const userAgent = request?.headers?.get('user-agent') || ''
      const ipAddress =
        request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip') || 'unknown'
      await saveRefreshToken(
        user.id,
        'admin',
        refreshTokenHash,
        30 * 24 * 60 * 60 * 1000, // 30 days
        'Admin Login',
        userAgent,
        ipAddress,
      )

      return {
        message: 'Login successful',
        token,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 hours in seconds
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_verify: user.is_verify,
        },
        user_type: 'admin',
      }
    }

    // For member users, enforce SMS verification
    if (user.is_sms_verified) {
      // Generate JWT token - should use Elysia JWT context in updated routes
      const token = generateToken(user.id, user.email)

      // Generate refresh token
      const refreshToken = generateRefreshToken()
      const refreshTokenHash = await hashRefreshToken(refreshToken)

      // Save refresh token
      const userAgent = request?.headers?.get('user-agent') || ''
      const ipAddress =
        request?.headers?.get('x-forwarded-for') || request?.headers?.get('x-real-ip') || 'unknown'
      await saveRefreshToken(
        user.id,
        'member',
        refreshTokenHash,
        30 * 24 * 60 * 60 * 1000, // 30 days
        'Member Login',
        userAgent,
        ipAddress,
      )

      return {
        message: 'Login successful',
        token,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 hours in seconds
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          last_name: user.last_name,
          profile_name: user.profile_name,
          phone_number: user.phone_number,
          is_email_confirmed: user.is_email_confirmed,
          is_sms_verified: user.is_sms_verified,
        },
        login_completed: true,
      }
    }


    // No phone number - require phone setup first
    const phoneSetupToken = generateScopedToken(
      { email, purpose: 'phone_setup', source: 'password' },
      '30m',
    )
    return {
      message: 'Please add your phone number to enable OTP verification before login.',
      phone_required: true,
      redirect_url: `/auth/phone-input?token=${encodeURIComponent(phoneSetupToken)}`,
      phone_setup_token: phoneSetupToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        is_email_confirmed: user.is_email_confirmed,
        is_sms_verified: user.is_sms_verified,
      },
    }
  } catch (err: any) {
    if (err.name === 'ZodError') {
      set.status = 400
      return { error: 'Validation failed', details: err.errors }
    }
    console.error('Login error:', err)
    set.status = 500
    return { error: 'Internal server error' }
  }
}





















