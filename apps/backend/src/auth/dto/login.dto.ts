import { z } from 'zod';

export const LoginDtoSchema = z
  .object({
    email: z.email(),
    // Not the new-password policy: older, shorter passwords must still work.
    password: z.string().min(1).max(128),
    /** 'Trust this device': keep the session for 30 days. */
    remember: z.boolean().optional(),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDtoSchema>;
