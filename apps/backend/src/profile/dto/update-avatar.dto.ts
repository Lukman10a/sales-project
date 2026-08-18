import { z } from 'zod';

export const UpdateAvatarDtoSchema = z
  .object({
    dataUrl: z
      .string()
      .regex(
        /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/i,
        'Avatar must be a base64 image data URL (jpeg, png, webp, gif or svg)',
      )
      .max(5_000_000, 'Avatar image is too large (max 5MB)'),
  })
  .strict();

export type UpdateAvatarDto = z.infer<typeof UpdateAvatarDtoSchema>;
