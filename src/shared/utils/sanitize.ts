/** Escape special characters for Postgres LIKE/ILIKE patterns */
export function sanitizeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}
