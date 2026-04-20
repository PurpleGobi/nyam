/**
 * PostgREST `.or()` / `.filter()` 안전 escape.
 *
 * PostgREST는 `,` `(` `)` `:` 를 filter syntax 구분자로 사용한다.
 * 사용자 입력을 raw 보간하면 추가 filter term을 주입할 수 있다 (filter injection).
 *
 * 사용 예:
 *   const safe = escapeForOrFilter(query)
 *   .or(`name.ilike.%${safe}%,producer.ilike.%${safe}%`)
 */
export function escapeForOrFilter(input: string, maxLength = 80): string {
  return input
    .slice(0, maxLength)
    .replace(/[,()*:\\]/g, ' ')
    .trim()
}
