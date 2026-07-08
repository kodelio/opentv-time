import { useDb } from '../../db/client'
import { topShows } from '../../services/stats/topShows'

export default defineEventHandler(() => topShows(useDb()))
