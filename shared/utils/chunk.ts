export function chunk<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0')
  }
  const result: (readonly T[])[] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}
