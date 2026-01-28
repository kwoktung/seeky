import { BaseService } from "./service";
import { domainSchema } from "@/lib/domain";
import { buildDomainSuggestionPrompt } from "@/lib/prompts/domain-suggestions";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { z } from "zod";

export interface DomainSuggestion {
  domain: string;
  available?: boolean;
  checking?: boolean;
  error?: string;
}

// Schema for AI response
const domainSuggestionsSchema = z.object({
  domains: z.array(domainSchema).describe("Array of domain name suggestions"),
});

export class DomainAIService extends BaseService {
  /**
   * Generate domain suggestions using Anthropic AI with structured output
   */
  async generateDomainSuggestions(
    description: string,
    limit: number = 10,
    exclude: string[] = [],
  ): Promise<string[]> {
    // Check if Anthropic API key exists
    const baseURL = this.ctx.env.ANTHROPIC_BASE_URL;
    if (!baseURL) {
      throw new Error("API configuration error");
    }

    const prompt = buildDomainSuggestionPrompt(description, limit, exclude);

    const anthropic = createAnthropic({
      baseURL,
      apiKey: 'not-needed',
    });

    const { output } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt,
      output: Output.object({
        schema: domainSuggestionsSchema,
      }),
    });

    // Filter out excluded domains (case-insensitive)
    const excludeSet = new Set(exclude.map((d) => d.toLowerCase()));
    const filtered = output.domains.filter(
      (domain) => !excludeSet.has(domain.toLowerCase()),
    );

    return filtered.slice(0, limit);
  }
}
