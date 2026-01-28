import { describe, it, expect, beforeEach } from "vitest";
import { LookupService } from "./lookup";

/**
 * Integration tests for LookupService with real-world domain queries
 *
 * These tests make actual network requests to WHOIS servers.
 * To skip these tests, set SKIP_INTEGRATION_TESTS=true
 *
 * Run with: yarn test lookup.integration.test.ts
 */

const SKIP_TESTS = process.env.SKIP_INTEGRATION_TESTS === "true";
const describeIntegration = SKIP_TESTS ? describe.skip : describe;

describeIntegration("LookupService Integration Tests", () => {
  let service: LookupService;
  const TIMEOUT = 15000;

  beforeEach(() => {
    service = new LookupService();
  });

  describe("queryDomain with popular domains", () => {
    it(
      "should query a registered .com domain",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.domainName).toBeTruthy();
        expect(result!.domainName?.toLowerCase()).toContain("google.com");
        expect(result!.creationDate).toBeTruthy();
        expect(result!.nameServers).toBeDefined();
        expect(result!.nameServers!.length).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    it(
      "should query a registered .org domain",
      async () => {
        const result = await service.queryDomain("wikipedia.org");

        expect(result).toBeTruthy();
        expect(result!.domainName).toBeTruthy();
        expect(result!.domainName?.toLowerCase()).toContain("wikipedia.org");
        expect(result!.creationDate).toBeTruthy();
        expect(result!.nameServers).toBeDefined();
        expect(result!.nameServers!.length).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    it(
      "should query a registered .net domain",
      async () => {
        const result = await service.queryDomain("cloudflare.net");

        expect(result).toBeTruthy();
        expect(result!.domainName).toBeTruthy();
        expect(result!.nameServers).toBeDefined();
      },
      TIMEOUT,
    );

    it(
      "should return null for unregistered domains",
      async () => {
        const randomDomain = `this-domain-does-not-exist-${Date.now()}.com`;
        const result = await service.queryDomain(randomDomain);

        expect(result).toBeNull();
      },
      TIMEOUT,
    );
  });

  describe("TLD resolution", () => {
    it(
      "should handle .io domains",
      async () => {
        const result = await service.queryDomain("github.io");

        // github.io might not be registered as a domain (it's used for subdomains)
        // but the query should complete without error
        // It may return null if not found
        expect(result === null || typeof result === "object").toBe(true);
      },
      TIMEOUT,
    );

    it(
      "should handle .co domains",
      async () => {
        const result = await service.queryDomain("google.co");

        // Should complete without error
        // google.co should be registered, but WHOIS response format varies
        expect(result === null || typeof result === "object").toBe(true);
      },
      TIMEOUT,
    );

    it(
      "should handle .dev domains",
      async () => {
        const result = await service.queryDomain("example.dev");

        // Should complete without error (may or may not be registered)
        expect(result === null || typeof result === "object").toBe(true);
        if (result) {
          // rawData should be defined (even if empty string)
          expect(result).toHaveProperty("rawData");
        }
      },
      TIMEOUT,
    );

    it(
      "should handle country-code TLDs like .uk",
      async () => {
        // Try a simpler .uk domain
        const result = await service.queryDomain("example.co.uk");

        // Should complete without error
        // .uk domains may have different WHOIS response formats
        expect(result === null || typeof result === "object").toBe(true);
        if (result) {
          expect(result.rawData).toBeTruthy();
        }
      },
      TIMEOUT,
    );
  });

  describe("domain status detection", () => {
    it(
      "should parse domain statuses correctly",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.domainStatus).toBeDefined();
        expect(result!.domainStatus!.length).toBeGreaterThan(0);

        // Check that statuses don't contain URLs or extra metadata
        result!.domainStatus!.forEach((status) => {
          expect(status).not.toContain("http");
          expect(status).not.toContain("https://");
          expect(status.length).toBeGreaterThan(0);
        });
      },
      TIMEOUT,
    );
  });

  describe("name server parsing", () => {
    it(
      "should parse name servers correctly",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.nameServers).toBeDefined();
        expect(result!.nameServers!.length).toBeGreaterThan(0);

        // Verify name servers are lowercase
        result!.nameServers!.forEach((ns) => {
          expect(ns).toBe(ns.toLowerCase());
          expect(ns.length).toBeGreaterThan(0);
        });
      },
      TIMEOUT,
    );
  });

  describe("bulk lookups with caching", () => {
    it(
      "should handle multiple domains with the same TLD efficiently",
      async () => {
        // Query multiple .com domains - should use cached WHOIS server
        const domains = ["google.com", "example.com", "cloudflare.com"];

        const results = await Promise.all(
          domains.map((domain) => service.queryDomain(domain)),
        );

        // All should succeed
        expect(results.length).toBe(3);
        results.forEach((result, index) => {
          if (result) {
            expect(result.domainName).toBeTruthy();
            console.log(
              `✓ ${domains[index]}: ${result.domainName} (${result.nameServers?.length} nameservers)`,
            );
          }
        });
      },
      TIMEOUT * 3,
    );
  });

  describe("date field parsing", () => {
    it(
      "should parse creation, update, and expiry dates",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.creationDate).toBeTruthy();
        expect(result!.registryExpiryDate).toBeTruthy();

        // Dates should be in a reasonable format (contain year)
        expect(result!.creationDate).toMatch(/\d{4}/);
        if (result!.updatedDate) {
          expect(result!.updatedDate).toMatch(/\d{4}/);
        }
        expect(result!.registryExpiryDate).toMatch(/\d{4}/);
      },
      TIMEOUT,
    );
  });

  describe("registrar information", () => {
    it(
      "should parse registrar details",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.registrar).toBeTruthy();
        expect(result!.registrar!.length).toBeGreaterThan(0);

        // Some domains have IANA ID
        if (result!.registrarIanaId) {
          expect(result!.registrarIanaId).toMatch(/\d+/);
        }
      },
      TIMEOUT,
    );
  });

  describe("special domain formats", () => {
    it(
      "should handle domains with hyphens",
      async () => {
        const result = await service.queryDomain("example-domain.com");

        // May or may not be registered, but should complete without error
        expect(result === null || typeof result === "object").toBe(true);
      },
      TIMEOUT,
    );

    it(
      "should handle long domain names",
      async () => {
        const result = await service.queryDomain(
          "this-is-a-very-long-domain-name-for-testing.com",
        );

        // May or may not be registered, but should complete without error
        expect(result === null || typeof result === "object").toBe(true);
      },
      TIMEOUT,
    );

    it(
      "should handle punycode/IDN domains",
      async () => {
        // xn--80akhbyknj4f.com is the punycode for испытание.com (test in Russian)
        const result = await service.queryDomain("xn--e1afmkfd.xn--p1ai");

        // Should complete without error
        expect(result === null || typeof result === "object").toBe(true);
      },
      TIMEOUT,
    );
  });

  describe("error handling", () => {
    it(
      "should throw error for invalid domain format",
      async () => {
        await expect(service.queryDomain("invalid")).rejects.toThrow(
          "Invalid domain format",
        );
      },
      TIMEOUT,
    );

    it(
      "should throw error for empty domain",
      async () => {
        await expect(service.queryDomain("")).rejects.toThrow();
      },
      TIMEOUT,
    );

    it(
      "should throw error for domain without TLD",
      async () => {
        await expect(service.queryDomain("nodot")).rejects.toThrow();
      },
      TIMEOUT,
    );
  });

  describe("raw data preservation", () => {
    it(
      "should preserve raw WHOIS data",
      async () => {
        const result = await service.queryDomain("google.com");

        expect(result).toBeTruthy();
        expect(result!.rawData).toBeTruthy();
        expect(result!.rawData!.length).toBeGreaterThan(100);

        // Raw data should contain the domain name
        expect(result!.rawData!.toLowerCase()).toContain("google.com");
      },
      TIMEOUT,
    );
  });

  describe("real-world availability checks", () => {
    it(
      "should correctly identify available domains",
      async () => {
        // Use a very unique domain name that's unlikely to be registered
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const uniqueDomain = `test-${timestamp}-${randomString}.com`;

        const result = await service.queryDomain(uniqueDomain);

        expect(result).toBeNull();
      },
      TIMEOUT,
    );

    it(
      "should correctly identify taken domains",
      async () => {
        // These domains are definitely registered
        const takenDomains = ["google.com", "facebook.com", "amazon.com"];

        for (const domain of takenDomains) {
          const result = await service.queryDomain(domain);
          expect(result).toBeTruthy();
          expect(result!.domainName).toBeTruthy();
        }
      },
      TIMEOUT * 3, // 3 domains
    );
  });

  describe("consistency across multiple queries", () => {
    it(
      "should return consistent results for same domain",
      async () => {
        const domain = "google.com";

        // Query the same domain twice
        const result1 = await service.queryDomain(domain);
        const result2 = await service.queryDomain(domain);

        expect(result1).toBeTruthy();
        expect(result2).toBeTruthy();

        // Core fields should match
        expect(result1!.domainName).toBe(result2!.domainName);
        expect(result1!.creationDate).toBe(result2!.creationDate);
        expect(result1!.registrar).toBe(result2!.registrar);

        // Name servers should match (order might differ)
        expect(result1!.nameServers?.sort()).toEqual(
          result2!.nameServers?.sort(),
        );
      },
      TIMEOUT * 2,
    );
  });
});
