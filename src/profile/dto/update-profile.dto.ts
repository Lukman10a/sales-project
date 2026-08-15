import { z } from 'zod';

export const UpdateProfileDtoSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    bio: z.string().max(500).optional(),
  })
  .strict();

export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
