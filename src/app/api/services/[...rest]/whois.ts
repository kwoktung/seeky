import { z, createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createContext } from "@/lib/context";
import { Services } from "@/services";
import { HttpResponse } from "@/lib/response";

const queryWhoisSchema = z.object({
  domain: z.string().min(1).openapi({
    description: "The domain name to query",
    example: "idealand.com",
  }),
});

const whoisDataSchema = z.object({
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

const whoisResponseSchema = z.object({
  success: z.boolean(),
  data: whoisDataSchema,
});

const queryWhois = createRoute({
  method: "get",
  path: "/",
  request: {
    query: queryWhoisSchema,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: whoisResponseSchema,
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

const whoisApp = new OpenAPIHono({
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

whoisApp.openapi(queryWhois, async (c) => {
  try {
    const { domain } = c.req.valid("query");

    const ctx = createContext(getCloudflareContext({ async: false }).env);
    const services = new Services(ctx);

    // Validate domain
    if (!services.whois.validateDomain(domain)) {
      return c.json(
        {
          success: false,
          error: "Invalid domain format",
        },
        400,
      );
    }

    // Query WHOIS data
    const whoisData = await services.whois.queryDomain(domain);

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

export default whoisApp;
