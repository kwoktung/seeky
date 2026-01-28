import { z, createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createContext } from "@/lib/context";
import { Services } from "@/services";
import { HttpResponse } from "@/lib/response";
import { domainSchema } from "@/lib/domain";

const queryDomainLookupSchema = z.object({
  domain: domainSchema.openapi({
    description: "The domain name to query",
    example: "idealand.com",
  }),
});

const domainLookupDataSchema = z.object({
  domainName: z.string().optional().openapi({
    description: "The domain name",
    example: "IDEALAND.COM",
  }),
  registryDomainId: z.string().optional().openapi({
    description: "Registry domain ID",
    example: "100275715_DOMAIN_COM-VRSN",
  }),
  registrarWhoisServer: z.string().optional().openapi({
    description: "Registrar WHOIS server",
    example: "whois.web.com",
  }),
  registrarUrl: z.string().optional().openapi({
    description: "Registrar URL",
    example: "http://www.namesecure.com",
  }),
  updatedDate: z.string().optional().openapi({
    description: "Last updated date",
    example: "2025-06-09T06:43:25Z",
  }),
  creationDate: z.string().optional().openapi({
    description: "Domain creation date",
    example: "2003-07-09T18:04:24Z",
  }),
  registryExpiryDate: z.string().optional().openapi({
    description: "Domain expiry date",
    example: "2026-07-09T18:04:24Z",
  }),
  registrar: z.string().optional().openapi({
    description: "Registrar name",
    example: "NameSecure L.L.C.",
  }),
  registrarIanaId: z.string().optional().openapi({
    description: "Registrar IANA ID",
    example: "30",
  }),
  registrarAbuseContactEmail: z.string().optional().openapi({
    description: "Registrar abuse contact email",
    example: "domain.operations@web.com",
  }),
  registrarAbuseContactPhone: z.string().optional().openapi({
    description: "Registrar abuse contact phone",
    example: "+1.8777228662",
  }),
  domainStatus: z.string().optional().openapi({
    description: "Domain status code",
    example:
      "clientTransferProhibited https://icann.org/epp#clientTransferProhibited",
  }),
  nameServers: z
    .array(z.string())
    .optional()
    .openapi({
      description: "Name servers",
      example: ["NS723.HOSTGATOR.COM", "NS724.HOSTGATOR.COM"],
    }),
  dnssec: z.string().optional().openapi({
    description: "DNSSEC status",
    example: "unsigned",
  }),
  rawData: z.string().optional().openapi({
    description: "Raw WHOIS data",
  }),
});

const domainLookupResponseSchema = z.object({
  success: z.boolean(),
  data: domainLookupDataSchema,
});

const bulkDomainLookupSchema = z.object({
  domains: z
    .array(domainSchema)
    .min(1)
    .max(10)
    .openapi({
      description: "Array of domain names to query (max 10)",
      example: ["idealand.com", "google.com", "github.com"],
    }),
});

const bulkDomainLookupResultSchema = z.object({
  domain: z.string().openapi({
    description: "The queried domain name",
  }),
  success: z.boolean().openapi({
    description: "Whether the query was successful",
  }),
  data: domainLookupDataSchema.optional().openapi({
    description: "Domain data if query was successful",
  }),
  error: z.string().optional().openapi({
    description: "Error message if query failed",
  }),
});

const bulkDomainLookupResponseSchema = z.object({
  success: z.boolean(),
  results: z.array(bulkDomainLookupResultSchema),
});

const domainLookupRouteDefinition = createRoute({
  method: "get",
  path: "/query",
  request: {
    query: queryDomainLookupSchema,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: domainLookupResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - Invalid domain",
    },
    500: {
      description: "Internal server error - WHOIS query failed",
    },
  },
});

const bulkDomainLookupRouteDefinition = createRoute({
  method: "post",
  path: "/bulk",
  request: {
    body: {
      content: {
        "application/json": {
          schema: bulkDomainLookupSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Success - Returns results for all queried domains",
      content: {
        "application/json": {
          schema: bulkDomainLookupResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - Invalid input (e.g., too many domains)",
    },
    500: {
      description: "Internal server error",
    },
  },
});

const domainLookupApp = new OpenAPIHono({
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

domainLookupApp.openapi(domainLookupRouteDefinition, async (c) => {
  try {
    const { domain } = c.req.valid("query");

    const ctx = createContext(getCloudflareContext({ async: false }).env);
    const services = new Services(ctx);

    // Query WHOIS data
    const whoisData = await services.lookup.queryDomain(domain);

    if (!whoisData) {
      return c.json(
        {
          success: false,
          error: "Domain not found",
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: whoisData,
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

domainLookupApp.openapi(bulkDomainLookupRouteDefinition, async (c) => {
  try {
    const { domains } = c.req.valid("json");

    const ctx = createContext(getCloudflareContext({ async: false }).env);
    const services = new Services(ctx);

    // Query all domains in parallel
    const results = await Promise.all(
      domains.map(async (domain) => {
        try {
          // Query WHOIS data
          const whoisData = await services.lookup.queryDomain(domain);

          if (!whoisData) {
            return {
              domain,
              success: false,
              error: "Domain not found",
            };
          }

          return {
            domain,
            success: true,
            data: whoisData,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          return {
            domain,
            success: false,
            error: errorMessage,
          };
        }
      }),
    );

    return c.json({
      success: true,
      results,
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

export default domainLookupApp;
