import { useDb } from '../../db/client'
import { statsOverview } from '../../services/stats/overview'

export default defineEventHandler(() => statsOverview(useDb()))
