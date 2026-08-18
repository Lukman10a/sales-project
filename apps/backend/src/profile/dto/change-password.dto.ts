import { z } from 'zod';

export const ChangePasswordDtoSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least 1 number'),
  })
  .strict();

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
