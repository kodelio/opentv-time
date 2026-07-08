import { z } from 'zod'
import { SUPPORTED_LANGUAGE_CODES } from '../../config/languages'

export const appLanguageSchema = z.enum(SUPPORTED_LANGUAGE_CODES)

export const updateSettingsSchema = z.object({
  displayLanguage: appLanguageSchema,
})

export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>
