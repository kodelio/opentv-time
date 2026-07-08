export class NotFoundError extends Error {
  readonly statusCode = 404

  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}
