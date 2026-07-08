export class TmdbError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'TmdbError'
  }
}

export class TmdbNotFoundError extends TmdbError {
  constructor(message = 'TMDB resource not found') {
    super(message, 404)
    this.name = 'TmdbNotFoundError'
  }
}

export class TmdbRateLimitError extends TmdbError {
  constructor(message = 'TMDB rate limit reached') {
    super(message, 429)
    this.name = 'TmdbRateLimitError'
  }
}
