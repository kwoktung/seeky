import { interpolate } from "@/lib/template";

/**
 * Domain suggestion prompt template
 */
const DOMAIN_SUGGESTION_PROMPT_TEMPLATE = `Generate {{limit}} creative and available domain name suggestions based on this description: "{{description}}".

Requirements:
- Each domain should be short (preferably under 15 characters)
- Use common TLDs (.com, .io, .ai, .co, .net)
- Make them memorable and easy to type
- Consider variations with hyphens if needed
- Return ONLY the domain names, one per line, without explanations or numbering{{#if excludeDomains}}
- DO NOT suggest these domains: {{excludeDomains}}{{/if}}

Example format:
example.com
example.io
example-ai.com`;

/**
 * Build the complete domain suggestion prompt
 */
export function buildDomainSuggestionPrompt(
  description: string,
  limit: number,
  exclude: string[],
): string {
  const excludeDomains = exclude.length > 0 ? `${exclude.join(", ")}` : "";

  return interpolate(DOMAIN_SUGGESTION_PROMPT_TEMPLATE, {
    limit,
    description,
    excludeDomains,
  });
}
