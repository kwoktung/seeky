/**
 * Enhanced template interpolation function
 * Supports:
 * - Variable interpolation: {{variable}}
 * - Conditional blocks: {{#if condition}}...{{/if}}
 * - Conditional blocks with else: {{#if condition}}...{{else}}...{{/if}}
 * - Negation: {{#if !condition}}...{{/if}}
 */
export function fillTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  let result = template;

  // Process conditional blocks: {{#if condition}}...{{else}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(!?)(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, negate, key, content) => {
      const value = data[key];
      let isTruthy =
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== 0 &&
        value !== false;

      // Handle array/object truthiness
      if (Array.isArray(value)) {
        isTruthy = value.length > 0;
      } else if (typeof value === "object" && value !== null) {
        isTruthy = Object.keys(value).length > 0;
      }

      // Apply negation if present
      if (negate === "!") {
        isTruthy = !isTruthy;
      }

      // Check if there's an else block
      const elseMatch = content.match(/^([\s\S]*?)\{\{else\}\}([\s\S]*)$/);
      if (elseMatch) {
        return isTruthy ? elseMatch[1] : elseMatch[2];
      }

      return isTruthy ? content : "";
    },
  );

  // Process variable interpolation: {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });

  return result;
}
