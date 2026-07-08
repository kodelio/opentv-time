import { useDb } from '../../db/client'
import { listMovies } from '../../services/movies/listMovies'

export default defineEventHandler(() => listMovies(useDb()))
