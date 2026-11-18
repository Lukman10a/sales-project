import { z } from 'zod';
import { newPasswordSchema } from '../../auth/passwords/password-policy';

export const ChangePasswordDtoSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: newPasswordSchema,
  })
  .strict();

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
