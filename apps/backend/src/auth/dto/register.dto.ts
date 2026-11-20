import { z } from 'zod';
import { newPasswordSchema } from '../passwords/password-policy';

export const RegisterDtoSchema = z
  .object({
    email: z.email(),
    password: newPasswordSchema,
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    businessName: z.string().min(2).max(100),
  })
  .strict();

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
