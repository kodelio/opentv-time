import { useDb } from '../../db/client'
import { genreStats } from '../../services/stats/genres'

export default defineEventHandler(() => genreStats(useDb()))
