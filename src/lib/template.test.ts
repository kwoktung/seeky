import { describe, it, expect } from "vitest";
import { interpolate } from "./template";

describe("interpolate", () => {
  describe("variable interpolation", () => {
    it("should interpolate simple variables", () => {
      const template = "Hello {{name}}, you are {{age}} years old.";
      const result = interpolate(template, { name: "John", age: 25 });
      expect(result).toBe("Hello John, you are 25 years old.");
    });

    it("should leave unmatched variables as-is", () => {
      const template = "Hello {{name}}, {{missing}}";
      const result = interpolate(template, { name: "John" });
      expect(result).toBe("Hello John, {{missing}}");
    });
  });

  describe("conditional blocks", () => {
    it("should render block when condition is truthy", () => {
      const template = "{{#if isLoggedIn}}Welcome back, {{username}}!{{/if}}";
      const result = interpolate(template, {
        isLoggedIn: true,
        username: "Alice",
      });
      expect(result).toBe("Welcome back, Alice!");
    });

    it("should not render block when condition is falsy", () => {
      const template = "{{#if isLoggedIn}}Welcome back!{{/if}}";
      const result = interpolate(template, { isLoggedIn: false });
      expect(result).toBe("");
    });

    it("should handle conditional with else block (truthy)", () => {
      const template = `{{#if hasItems}}You have items in your cart.{{else}}Your cart is empty.{{/if}}`;
      const result = interpolate(template, { hasItems: true });
      expect(result).toBe("You have items in your cart.");
    });

    it("should handle conditional with else block (falsy)", () => {
      const template = `{{#if hasItems}}You have items in your cart.{{else}}Your cart is empty.{{/if}}`;
      const result = interpolate(template, { hasItems: false });
      expect(result).toBe("Your cart is empty.");
    });
  });

  describe("negation", () => {
    it("should handle negation when value is falsy", () => {
      const template = "{{#if !isHidden}}This content is visible{{/if}}";
      const result = interpolate(template, { isHidden: false });
      expect(result).toBe("This content is visible");
    });

    it("should handle negation when value is truthy", () => {
      const template = "{{#if !isHidden}}This content is visible{{/if}}";
      const result = interpolate(template, { isHidden: true });
      expect(result).toBe("");
    });
  });

  describe("array truthiness", () => {
    it("should treat non-empty array as truthy", () => {
      const template = `{{#if items}}You have {{count}} items{{else}}No items found{{/if}}`;
      const result = interpolate(template, { items: ["a", "b"], count: 2 });
      expect(result).toBe("You have 2 items");
    });

    it("should treat empty array as falsy", () => {
      const template = `{{#if items}}You have {{count}} items{{else}}No items found{{/if}}`;
      const result = interpolate(template, { items: [], count: 0 });
      expect(result).toBe("No items found");
    });
  });

  describe("complex templates", () => {
    it("should handle multiple conditions in a single template", () => {
      const template = `
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
      const result = interpolate(template, {
        limit: 10,
        excludeDomains: "example.com, test.com",
        includePremium: true,
      });

      expect(result).toContain("Generate 10 suggestions");
      expect(result).toContain("Exclude: example.com, test.com");
      expect(result).toContain("Include premium domains");
      expect(result).not.toContain("Standard domains only");
    });
  });
});
