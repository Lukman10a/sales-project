import { z } from 'zod';

export const LoginDtoSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
  })
  .strict();

export type LoginDto = z.infer<typeof LoginDtoSchema>;
