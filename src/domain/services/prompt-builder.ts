/**
 * Prompt builder service
 * Pure function: replaces [variable_key] placeholders in template text with actual values
 */

import type { PromptTemplate } from '../entities/prompt';

/**
 * Build a prompt string by replacing variable placeholders with provided values.
 *
 * Placeholders use the format `[label]` where `label` matches
 * the `label` field of a PromptVariable defined in the template.
 *
 * @param template - The prompt template containing the template text and variable definitions
 * @param variables - A record mapping variable keys to their replacement values
 * @returns The fully interpolated prompt string
 *
 * @example
 * ```ts
 * const result = buildPrompt(template, {
 *   restaurant_name: "스시오마카세",
 *   region: "강남",
 * });
 * ```
 */
export function buildPrompt(
  template: PromptTemplate,
  variables: Record<string, string>,
): string {
  let result = template.template;

  for (const variable of template.variables) {
    const value = variables[variable.key];
    if (value !== undefined) {
      // Replace [label] placeholder with the actual value
      const placeholder = `[${variable.label}]`;
      result = result.replaceAll(placeholder, value);
    }
  }

  return result;
}
