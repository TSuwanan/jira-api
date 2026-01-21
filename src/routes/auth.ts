import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { authMiddleware, requireAuth, requireMemberAccount } from '../utils/authHelpers'
import {
  login,
} from '../controllers/auth'
import {
  loginSchema,
} from '../schemas/auth'

const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      exp: process.env.JWT_EXPIRES_IN || '24h',
    }),
  )

  // FR-005: ระบบรักษาความปลอดภัย - Login
  .post('/login', login, {
    body: loginSchema,
    detail: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'FR-005: ระบบรักษาความปลอดภัย - Login with email and password',
    },
  })





  // Public routes - must be before auth middleware
  .guard({}, app =>
    app
  )

  // Protected routes - require authentication
  .derive(authMiddleware)
  .derive(requireAuth)
  .derive(requireMemberAccount)



export { authRoutes }
