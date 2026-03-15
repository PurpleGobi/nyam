export interface PromptContext {
  restaurantName?: string
  region?: string
  cuisine?: string
  situation?: string
  partySize?: string
  budget?: string
  mood?: string
  exclude?: string
}

/**
 * Replace template variables with context values.
 * Variables: [식당명], [지역], [상황], [N], [금액], [분위기], [알러지/비선호], [음식 종류]
 * Also handles: [식당A], [식당B], [식당C], [인원]
 */
export function resolvePrompt(template: string, context: PromptContext): string {
  return template
    .replace(/\[식당명\]/g, context.restaurantName || '___')
    .replace(/\[지역\]/g, context.region || '___')
    .replace(/\[상황\]/g, context.situation || '___')
    .replace(/\[N\]/g, context.partySize || '2')
    .replace(/\[인원\]/g, context.partySize || '2')
    .replace(/\[금액\]/g, context.budget || '30000')
    .replace(/\[예산\]/g, context.budget || '30000')
    .replace(/\[분위기\]/g, context.mood || '편안한')
    .replace(/\[키워드\]/g, context.mood || '편안한')
    .replace(/\[알러지\/비선호\]/g, context.exclude || '없음')
    .replace(/\[제외\]/g, context.exclude || '없음')
    .replace(/\[음식 종류\]/g, context.cuisine || '한식')
    .replace(/\[음식종류\]/g, context.cuisine || '한식')
    .replace(/\[식당A\]/g, context.restaurantName || '___')
    .replace(/\[식당B\]/g, '___')
    .replace(/\[식당C\]/g, '___')
}

export function hasUnresolvedVars(text: string): boolean {
  return /___/.test(text) || /\[.+?\]/.test(text)
}
