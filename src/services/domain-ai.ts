import { BaseService } from "./service";

export interface DomainSuggestion {
  domain: string;
  available?: boolean;
  checking?: boolean;
  error?: string;
}

export class DomainAIService extends BaseService {
  /**
   * Generate domain suggestions using Cloudflare AI
   */
  async generateDomainSuggestions(
    description: string,
    limit: number = 10,
  ): Promise<string[]> {
    try {
      // Check if AI binding exists
      const ai = this.ctx.env.AI;
      if (!ai) {
        // Fallback: Generate simple suggestions without AI
        return this.generateFallbackSuggestions(description, limit);
      }

      const prompt = `Generate ${limit} creative and available domain name suggestions based on this description: "${description}". 
      
Requirements:
- Each domain should be short (preferably under 15 characters)
- Use common TLDs (.com, .io, .ai, .co, .net)
- Make them memorable and easy to type
- Consider variations with hyphens if needed
- Return ONLY the domain names, one per line, without explanations or numbering

Example format:
example.com
example.io
example-ai.com`;

      const response = await ai.run("@cf/meta/llama-3-8b-instruct", {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parse the response to extract domain names
      const suggestions = this.parseDomainSuggestions(
        response.response || "",
        limit,
      );

      return suggestions;
    } catch (error) {
      this.ctx.logger.error("Failed to generate AI domain suggestions", {
        error,
      });
      // Fallback to simple suggestions
      return this.generateFallbackSuggestions(description, limit);
    }
  }

  /**
   * Parse domain suggestions from AI response
   */
  private parseDomainSuggestions(response: string, limit: number): string[] {
    const lines = response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        // Filter out empty lines, numbered lists, and non-domain text
        return (
          line &&
          line.includes(".") &&
          !line.match(/^\d+\./) && // Remove numbered items like "1."
          !line.toLowerCase().includes("here") &&
          !line.toLowerCase().includes("suggestion")
        );
      })
      .map((line) => {
        // Clean up the domain - remove leading symbols, quotes, etc.
        return line
          .replace(/^[-*•\d)\].]+\s*/, "")
          .replace(/['"]/g, "")
          .toLowerCase()
          .trim();
      })
      .filter((domain) => this.isValidDomainFormat(domain));

    return lines.slice(0, limit);
  }

  /**
   * Generate fallback domain suggestions without AI
   */
  private generateFallbackSuggestions(
    description: string,
    limit: number,
  ): string[] {
    const keywords = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 3);

    if (keywords.length === 0) {
      keywords.push("domain");
    }

    const tlds = [".com", ".io", ".ai", ".co", ".net", ".org"];
    const prefixes = ["get", "try", "my", "the", "app", ""];
    const suffixes = ["app", "hub", "lab", "pro", "hq", ""];

    const suggestions: string[] = [];
    const seen = new Set<string>();

    // Generate combinations
    for (const keyword of keywords) {
      for (const tld of tlds) {
        if (suggestions.length >= limit) break;

        // Direct keyword + tld
        const direct = `${keyword}${tld}`;
        if (!seen.has(direct)) {
          suggestions.push(direct);
          seen.add(direct);
        }

        // Prefix + keyword + tld
        for (const prefix of prefixes) {
          if (suggestions.length >= limit) break;
          if (prefix) {
            const withPrefix = `${prefix}${keyword}${tld}`;
            if (!seen.has(withPrefix)) {
              suggestions.push(withPrefix);
              seen.add(withPrefix);
            }
          }
        }

        // Keyword + suffix + tld
        for (const suffix of suffixes) {
          if (suggestions.length >= limit) break;
          if (suffix) {
            const withSuffix = `${keyword}${suffix}${tld}`;
            if (!seen.has(withSuffix)) {
              suggestions.push(withSuffix);
              seen.add(withSuffix);
            }
          }
        }
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Validate domain format
   */
  private isValidDomainFormat(domain: string): boolean {
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
}
