import { useDb } from '../db/client'
import { upNext } from '../services/home/upNext'

export default defineEventHandler(() => upNext(useDb()))
