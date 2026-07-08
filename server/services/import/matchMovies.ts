import type { TmdbMovieSummary } from '../../../shared/schemas/tmdb'
import { normalizeTitle } from './normalizeTitle'

export interface ScoredCandidate {
  readonly summary: TmdbMovieSummary
  readonly score: number
  readonly exactTitle: boolean
  readonly yearDelta: number | null
}

const EXACT_TITLE_POINTS = 60
const YEAR_EXACT_POINTS = 25
const YEAR_CLOSE_POINTS = 15
const YEAR_UNKNOWN_POINTS = 5
const POSITION_POINTS_MAX = 10

export function scoreCandidates(
  titles: readonly string[],
  releaseYear: number | null,
  candidates: readonly TmdbMovieSummary[],
): readonly ScoredCandidate[] {
  const normalizedTitles = new Set(titles.filter(Boolean).map(normalizeTitle))

  return candidates.map((summary, index) => {
    const candidateTitles = [summary.title, summary.original_title ?? ''].filter(Boolean)
    const exactTitle = candidateTitles.some(title => normalizedTitles.has(normalizeTitle(title)))
    const candidateYear = summary.release_date ? Number(summary.release_date.slice(0, 4)) : null
    const yearDelta =
      releaseYear !== null && candidateYear !== null ? Math.abs(releaseYear - candidateYear) : null

    const yearPoints =
      yearDelta === null
        ? YEAR_UNKNOWN_POINTS
        : yearDelta === 0
          ? YEAR_EXACT_POINTS
          : yearDelta === 1
            ? YEAR_CLOSE_POINTS
            : 0
    const positionPoints = Math.max(POSITION_POINTS_MAX - index, 0)

    return {
      summary,
      exactTitle,
      yearDelta,
      score: (exactTitle ? EXACT_TITLE_POINTS : 0) + yearPoints + positionPoints,
    }
  })
}

export function pickAutoMatch(scored: readonly ScoredCandidate[]): TmdbMovieSummary | null {
  const exactSameYear = scored.filter(item => item.exactTitle && item.yearDelta === 0)
  if (exactSameYear.length === 1) {
    return exactSameYear[0]!.summary
  }
  const exactCloseYear = scored.filter(
    item => item.exactTitle && (item.yearDelta === null || item.yearDelta <= 1),
  )
  if (exactCloseYear.length === 1) {
    return exactCloseYear[0]!.summary
  }
  return null
}

export function topCandidates(scored: readonly ScoredCandidate[], count = 5) {
  return [...scored]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(item => ({
      tmdbId: item.summary.id,
      title: item.summary.title,
      originalTitle: item.summary.original_title ?? undefined,
      releaseDate: item.summary.release_date ?? undefined,
      posterPath: item.summary.poster_path ?? undefined,
      overview: item.summary.overview ?? undefined,
      score: item.score,
    }))
}
