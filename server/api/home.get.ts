import { useDb } from '../db/client'
import { homeSummary } from '../services/home/homeSummary'

export default defineEventHandler(() => homeSummary(useDb()))
