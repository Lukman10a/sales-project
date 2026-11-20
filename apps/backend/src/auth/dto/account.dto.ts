import { z } from 'zod';
import { newPasswordSchema } from '../passwords/password-policy';

const token = z.string().min(20).max(200);

export const EmailDtoSchema = z.object({ email: z.email() }).strict();
export type EmailDto = z.infer<typeof EmailDtoSchema>;

export const TokenDtoSchema = z.object({ token }).strict();
export type TokenDto = z.infer<typeof TokenDtoSchema>;

export const ResetPasswordDtoSchema = z
  .object({ token, password: newPasswordSchema })
  .strict();
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
