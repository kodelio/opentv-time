import { useDb } from '../../db/client'
import { monthlyStats } from '../../services/stats/monthly'

export default defineEventHandler(() => monthlyStats(useDb()))
