import { useDb } from '../db/client'
import { getAppSettings } from '../services/settings/appSettings'

export default defineEventHandler(() => getAppSettings(useDb()))
