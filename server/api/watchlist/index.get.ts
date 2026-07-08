import { useDb } from '../../db/client'
import { listWatchlist } from '../../services/watchlist/listWatchlist'

export default defineEventHandler(() => listWatchlist(useDb()))
