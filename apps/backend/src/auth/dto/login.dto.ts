import { z } from 'zod';

export const LoginDtoSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    /** 'Trust this device': keep the session for 30 days. */
    remember: z.boolean().optional(),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDtoSchema>;
