import { updateSettingsSchema } from '../../shared/schemas/api/settings'
import { useDb } from '../db/client'
import { updateAppSettings } from '../services/settings/appSettings'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, updateSettingsSchema.parse)
  return updateAppSettings(useDb(), { displayLanguage: body.displayLanguage })
})
