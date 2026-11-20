import { z } from 'zod';

/** A 6-digit authenticator code, or a backup code such as `abcde-fghjk`. */
const code = z.string().trim().min(6).max(20);

export const TwoFactorCodeDtoSchema = z.object({ code }).strict();
export type TwoFactorCodeDto = z.infer<typeof TwoFactorCodeDtoSchema>;

export const VerifyTwoFactorDtoSchema = z
  .object({ challenge: z.string().min(20).max(2048), code })
  .strict();
export type VerifyTwoFactorDto = z.infer<typeof VerifyTwoFactorDtoSchema>;

export const DisableTwoFactorDtoSchema = z
  .object({ password: z.string().min(1).max(128), code })
  .strict();
export type DisableTwoFactorDto = z.infer<typeof DisableTwoFactorDtoSchema>;

export const TwoFactorRequirementDtoSchema = z
  .object({ required: z.boolean() })
  .strict();
export type TwoFactorRequirementDto = z.infer<
  typeof TwoFactorRequirementDtoSchema
>;
