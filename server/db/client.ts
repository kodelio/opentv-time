import { useRuntimeConfig } from '#imports'
import { createDb, type Db } from './createDb'

let instance: Db | null = null

export function useDb(): Db {
  if (!instance) {
    const config = useRuntimeConfig()
    instance = createDb(config.databasePath)
  }
  return instance
}
