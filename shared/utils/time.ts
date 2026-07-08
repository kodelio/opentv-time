export function nowIso(): string {
  return new Date().toISOString()
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
