import type { PromptTemplate } from '@/domain/entities/prompt'

/**
 * Build final prompt text by replacing variable placeholders with values.
 */
export function buildPrompt(
  template: PromptTemplate,
  vars: Record<string, string>,
): string {
  let text = template.template

  for (const v of template.variables) {
    const value = vars[v.key] || '___'
    // Replace all bracket-style placeholders: [식당명], [지역], etc.
    const patterns = getPatterns(v.key, v.label)
    for (const pattern of patterns) {
      text = text.replaceAll(pattern, value)
    }
  }

  return text
}

function getPatterns(key: string, label: string): string[] {
  const patterns = [`[${label}]`]

  // Common mappings
  const keyMap: Record<string, string[]> = {
    restaurant_name: ['[식당명]'],
    region: ['[지역]'],
    cuisine: ['[음식종류]', '[음식 종류]'],
    situation: ['[상황]'],
    party_size: ['[N]', '[인원]'],
    budget: ['[금액]', '[예산]'],
    mood: ['[분위기]', '[키워드]'],
    exclude: ['[알러지/비선호]', '[제외]'],
    restaurant_a: ['[식당A]'],
    restaurant_b: ['[식당B]'],
    restaurant_c: ['[식당C]'],
  }

  if (keyMap[key]) {
    patterns.push(...keyMap[key])
  }

  return patterns
}
