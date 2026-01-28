import { z, createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createContext } from "@/lib/context";
import { Services } from "@/services";
import { HttpResponse } from "@/lib/response";

const domainSuggestBodySchema = z.object({
  description: z.string().min(1).openapi({
    description: "Description of the domain or business idea",
    example: "a social network for developers",
  }),
  limit: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(10)
    .openapi({
      description: "Maximum number of domain suggestions (1-20)",
      example: 10,
    }),
  exclude: z
    .array(z.string())
    .optional()
    .default([])
    .openapi({
      description: "Array of domains to exclude from suggestions",
      example: ["example.com", "test.com"],
    }),
});

const domainSuggestionSchema = z.object({
  domain: z.string().openapi({
    description: "Suggested domain name",
    example: "connect.io",
  }),
});

const domainSuggestResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    suggestions: z.array(domainSuggestionSchema),
    count: z.number(),
  }),
});

const suggestDomains = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: domainSuggestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: domainSuggestResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - Invalid parameters",
    },
    500: {
      description: "Internal server error - AI generation failed",
    },
  },
});

const domainSuggestApp = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return HttpResponse.error(c, {
        message: result.error.message,
        status: 400,
      });
    }
    return result;
  },
});

domainSuggestApp.openapi(suggestDomains, async (c) => {
  try {
    const { description, limit, exclude } = c.req.valid("json");

    const ctx = createContext(getCloudflareContext({ async: false }).env);
    const services = new Services(ctx);

    // Generate domain suggestions using AI with exclude parameter
    const suggestions = await services.domainAI.generateDomainSuggestions(
      description,
      limit,
      exclude,
    );

    return c.json({
      success: true,
      data: {
        suggestions: suggestions.map((domain) => ({ domain })),
        count: suggestions.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return c.json(
      {
        success: false,
        error: errorMessage,
      },
      500,
    );
  }
});

export default domainSuggestApp;
