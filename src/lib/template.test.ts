import { fillTemplate } from "./template";

/**
 * Example usage and tests for the enhanced template interpolation
 */

// Example 1: Simple variable interpolation
const template1 = "Hello {{name}}, you are {{age}} years old.";
const result1 = fillTemplate(template1, { name: "John", age: 25 });
console.log("Example 1:", result1);
// Output: "Hello John, you are 25 years old."

// Example 2: Conditional block (truthy)
const template2 = "{{#if isLoggedIn}}Welcome back, {{username}}!{{/if}}";
const result2 = fillTemplate(template2, {
  isLoggedIn: true,
  username: "Alice",
});
console.log("Example 2:", result2);
// Output: "Welcome back, Alice!"

// Example 3: Conditional block (falsy)
const template3 = "{{#if isLoggedIn}}Welcome back!{{/if}}";
const result3 = fillTemplate(template3, { isLoggedIn: false });
console.log("Example 3:", result3);
// Output: ""

// Example 4: Conditional with else
const template4 = `{{#if hasItems}}You have items in your cart.{{else}}Your cart is empty.{{/if}}`;
const result4a = fillTemplate(template4, { hasItems: true });
const result4b = fillTemplate(template4, { hasItems: false });
console.log("Example 4a:", result4a);
// Output: "You have items in your cart."
console.log("Example 4b:", result4b);
// Output: "Your cart is empty."

// Example 5: Negation
const template5 = "{{#if !isHidden}}This content is visible{{/if}}";
const result5a = fillTemplate(template5, { isHidden: false });
const result5b = fillTemplate(template5, { isHidden: true });
console.log("Example 5a:", result5a);
// Output: "This content is visible"
console.log("Example 5b:", result5b);
// Output: ""

// Example 6: Array truthiness
const template6 = `{{#if items}}You have {{count}} items{{else}}No items found{{/if}}`;
const result6a = fillTemplate(template6, { items: ["a", "b"], count: 2 });
const result6b = fillTemplate(template6, { items: [], count: 0 });
console.log("Example 6a:", result6a);
// Output: "You have 2 items"
console.log("Example 6b:", result6b);
// Output: "No items found"

// Example 7: Complex template with multiple conditions
const template7 = `
Generate {{limit}} suggestions.
{{#if excludeDomains}}
- Exclude: {{excludeDomains}}
{{/if}}
{{#if includePremium}}
- Include premium domains
{{else}}
- Standard domains only
{{/if}}
`;
const result7 = fillTemplate(template7, {
  limit: 10,
  excludeDomains: "example.com, test.com",
  includePremium: true,
});
console.log("Example 7:", result7);

export {
  template1,
  template2,
  template3,
  template4,
  template5,
  template6,
  template7,
};
