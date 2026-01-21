import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  employee_id: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  role_id: z.number().int().positive('Role ID must be a positive integer'),
  position_code: z.string().optional(),
  level_code: z.string().optional(),
  is_veriy: z.boolean().optional().default(true),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})