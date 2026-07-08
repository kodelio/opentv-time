import { createError } from '#imports'
import { NotFoundError } from '../services/errors'

export function toHttpError(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw createError({ statusCode: error.statusCode, message: error.message })
  }
  console.error('Unexpected server error:', error)
  throw createError({ statusCode: 500, message: 'Internal error' })
}
