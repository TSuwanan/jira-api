// import { Elysia } from 'elysia'
// import { jwt } from '@elysiajs/jwt'
// import { authMiddleware, requireAuth, requireMemberAccount } from '../utils/authHelpers'
// import {
//   register,
//   verifyEmail,
//   verifyOTP,
//   login,
//   forgotPassword,
//   setPassword,
//   changePassword,
//   googleLogin,
//   appleLogin,
//   registerEmail,
//   registerPhone,
//   resendOTP,
//   getCurrentOTP,
//   getOTPSession,
//   resolveEmailByToken,
//   checkEmailExists,
//   refreshToken,
//   revokeRefreshToken,
// } from '../controllers/auth'
// import {
//   registerSchema,
//   loginSchema,
//   verifyOTPSchema,
//   resetPasswordSchema,
//   setPasswordSchema,
//   changePasswordSchema,
//   googleLoginSchema,
//   appleLoginSchema,
//   registerEmailSchema,
//   registerPhoneSchema,
//   resendOTPSchema,
// } from '../schemas/auth'

// const authRoutes = new Elysia({ prefix: '/api/auth' })
//   .use(
//     jwt({
//       name: 'jwt',
//       secret: process.env.JWT_SECRET || 'fallback-secret-key',
//       exp: process.env.JWT_EXPIRES_IN || '24h',
//     }),
//   )
//   // FR-001: ระบบสมัครสมาชิก
//   .post('/register', register, {
//     body: registerSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Register new user',
//       description:
//         'FR-001: ระบบสมัครสมาชิก - Register a new member with email and phone verification',
//     },
//   })

//   // FR-001-1: ระบบยืนยันอีเมล
//   .get('/verify-email', verifyEmail, {
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Verify email address',
//       description: 'FR-001-1: ระบบยืนยันอีเมล - Verify email with token from email link',
//     },
//   })

//   // FR-002: ระบบยืนยันตัวตนสำหรับสมาชิก
//   .post('/verify-otp', verifyOTP, {
//     body: verifyOTPSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Verify OTP code',
//       description: 'FR-002: ระบบยืนยันตัวตนสำหรับสมาชิก - Verify OTP for registration or login',
//     },
//   })

//   // FR-005: ระบบรักษาความปลอดภัย - Login
//   .post('/login', login, {
//     body: loginSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'User login',
//       description: 'FR-005: ระบบรักษาความปลอดภัย - Login with email and password',
//     },
//   })

//   // FR-006-3: ระบบลืมรหัสผ่าน
//   .post('/forgot-password', forgotPassword, {
//     body: resetPasswordSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Forgot password',
//       description: 'FR-006-3: ระบบลืมรหัสผ่าน - Request password reset',
//     },
//   })

//   // Google OAuth Login (public route - must be before authMiddleware)
//   .post('/google', googleLogin, {
//     body: googleLoginSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Google OAuth login',
//       description: 'Login or register using Google OAuth token',
//     },
//   })

//   // Apple OAuth Login (public route - must be before authMiddleware)
//   .post('/apple', appleLogin, {
//     body: appleLoginSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Apple ID login',
//       description: 'Login or register using Apple ID token',
//     },
//   })

//   // Public routes - must be before auth middleware
//   .guard({}, app =>
//     app
//       // Phase 1: Email and password only
//       .post('/register-email', registerEmail, {
//         body: registerEmailSchema,
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Register with email (Phase 1)',
//           description: 'Phase 1 of registration: Email and password only',
//         },
//       })

//       // Phase 2: Add phone number after email verification
//       .post('/register-phone', registerPhone, {
//         body: registerPhoneSchema,
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Add phone number (Phase 2)',
//           description: 'Phase 2 of registration: Add phone number after email verification',
//         },
//       })

//       // Resend OTP
//       .post('/resend-otp', resendOTP, {
//         body: resendOTPSchema,
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Resend OTP',
//           description: 'Resend OTP code to registered phone number',
//         },
//       })

//       // Get current OTP status
//       .get('/current-otp', getCurrentOTP, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Get current OTP status',
//           description: 'Get current OTP session status for a user',
//         },
//       })

//       // Get OTP session data by UUID
//       .get('/otp-session/:sessionUuid', getOTPSession, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Get OTP session by UUID',
//           description: 'Retrieve OTP session data using session UUID',
//         },
//       })

//       // Resolve email from scoped token
//       .get('/resolve-email', resolveEmailByToken, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Resolve email from token',
//           description: 'Get email address from scoped token (e.g., Google phone-setup token)',
//         },
//       })

//       // Check if email exists (public route - no auth required)
//       .get('/check-email', checkEmailExists, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Check if email exists',
//           description: 'Check if an email is already registered in the system',
//         },
//       })

//       // Refresh access token
//       .post('/refresh-token', refreshToken, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Refresh access token',
//           description: 'Generate new access token using refresh token',
//         },
//       })

//       // Revoke refresh token
//       .post('/revoke-refresh-token', revokeRefreshToken, {
//         detail: {
//           tags: ['Authentication'],
//           summary: 'Revoke refresh token',
//           description: 'Revoke a refresh token to logout from a specific device',
//         },
//       }),
//   )

//   // Protected routes - require authentication
//   .derive(authMiddleware)
//   .derive(requireAuth)
//   .derive(requireMemberAccount)
//   // FR-006-1: ระบบตั้งค่ารหัสผ่าน (requires authentication)
//   .post('/set-password', setPassword, {
//     body: setPasswordSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Set new password',
//       description: 'FR-006-1: ระบบตั้งค่ารหัสผ่าน - Set password for first-time or after reset',
//       security: [{ bearerAuth: [] }],
//     },
//   })

//   // FR-006-2: ระบบเปลี่ยนรหัสผ่าน (requires authentication)
//   .post('/change-password', changePassword, {
//     body: changePasswordSchema,
//     detail: {
//       tags: ['Authentication'],
//       summary: 'Change password',
//       description: 'FR-006-2: ระบบเปลี่ยนรหัสผ่าน - Change password with old password verification',
//       security: [{ bearerAuth: [] }],
//     },
//   })

// export { authRoutes }
