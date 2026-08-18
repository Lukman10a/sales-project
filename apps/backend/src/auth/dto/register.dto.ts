import { z } from 'zod';

export const RegisterDtoSchema = z
  .object({
    email: z.email(),
    password: z
      .string()
      .min(8)
      .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    businessName: z.string().min(2).max(100),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
