import { describe, it, expect } from "vitest";
import { executeWhoisQuery } from "./whois-query";
import { parseWhoisData } from "./whois-parser";

/**
 * Integration tests for WHOIS query and parser with real-world domains
 *
 * These tests make actual network requests to WHOIS servers.
 * To skip these tests, set SKIP_INTEGRATION_TESTS=true
 *
 * Run with: yarn test whois.integration.test.ts
 */

const SKIP_TESTS = process.env.SKIP_INTEGRATION_TESTS === "true";
const describeIntegration = SKIP_TESTS ? describe.skip : describe;

describeIntegration("WHOIS Integration Tests", () => {
  // Increase timeout for network requests
  const TIMEOUT = 15000;

  describe("executeWhoisQuery with real servers", () => {
    it(
      "should query a .com domain from whois.verisign-grs.com",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "google.com",
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();
        expect(rawData.length).toBeGreaterThan(0);
        expect(rawData.toLowerCase()).toContain("domain name");
      },
      TIMEOUT,
    );

    it(
      "should query a .org domain from whois.pir.org",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.pir.org",
          "wikipedia.org",
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();
        expect(rawData.length).toBeGreaterThan(0);
        expect(rawData.toLowerCase()).toContain("domain name");
      },
      TIMEOUT,
    );

    it(
      "should query a .net domain from whois.verisign-grs.com",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "cloudflare.net",
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();
        expect(rawData.length).toBeGreaterThan(0);
        expect(rawData.toLowerCase()).toContain("domain name");
      },
      TIMEOUT,
    );

    it(
      "should handle domain not found responses",
      async () => {
        const randomDomain = `thisdomainshouldreallynotexist${Date.now()}.com`;
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          randomDomain,
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();
        expect(
          rawData.toLowerCase().includes("no match") ||
            rawData.toLowerCase().includes("not found"),
        ).toBe(true);
      },
      TIMEOUT,
    );
  });

  describe("parseWhoisData with real responses", () => {
    it(
      "should parse a real .com domain WHOIS response",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "google.com",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed.domainName).toBeTruthy();
        expect(parsed.domainName?.toLowerCase()).toContain("google.com");
        expect(parsed.creationDate).toBeTruthy();
        expect(parsed.registryExpiryDate).toBeTruthy();
        expect(parsed.nameServers).toBeDefined();
        expect(parsed.nameServers!.length).toBeGreaterThan(0);
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );

    it(
      "should parse a real .org domain WHOIS response",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.pir.org",
          "wikipedia.org",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed.domainName).toBeTruthy();
        expect(parsed.domainName?.toLowerCase()).toContain("wikipedia.org");
        expect(parsed.creationDate).toBeTruthy();
        expect(parsed.nameServers).toBeDefined();
        expect(parsed.nameServers!.length).toBeGreaterThan(0);
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );

    it(
      "should parse domain status correctly from real data",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "google.com",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed.domainStatus).toBeDefined();
        expect(parsed.domainStatus!.length).toBeGreaterThan(0);
        // Verify status values don't contain URLs
        parsed.domainStatus!.forEach((status) => {
          expect(status).not.toContain("http");
          expect(status).not.toContain("https");
        });
      },
      TIMEOUT,
    );

    it(
      "should parse name servers correctly from real data",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "google.com",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed.nameServers).toBeDefined();
        expect(parsed.nameServers!.length).toBeGreaterThan(0);
        // Verify all name servers are lowercase
        parsed.nameServers!.forEach((ns) => {
          expect(ns).toBe(ns.toLowerCase());
        });
      },
      TIMEOUT,
    );
  });

  describe("end-to-end workflow", () => {
    it(
      "should complete full workflow for a registered domain",
      async () => {
        // Query
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          "example.com",
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();

        // Parse
        const parsed = parseWhoisData(rawData);

        // Verify parsed data structure
        expect(parsed).toHaveProperty("domainName");
        expect(parsed).toHaveProperty("domainStatus");
        expect(parsed).toHaveProperty("nameServers");
        expect(parsed).toHaveProperty("rawData");

        // Verify actual data
        expect(parsed.domainName).toBeTruthy();
        expect(Array.isArray(parsed.domainStatus)).toBe(true);
        expect(Array.isArray(parsed.nameServers)).toBe(true);
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );

    it(
      "should handle unregistered domain gracefully",
      async () => {
        const randomDomain = `unregistered-domain-${Date.now()}-test.com`;

        // Query
        const rawData = await executeWhoisQuery(
          "whois.verisign-grs.com",
          randomDomain,
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();

        // Parse
        const parsed = parseWhoisData(rawData);

        // Should still return valid structure even for unregistered domains
        expect(parsed).toHaveProperty("domainStatus");
        expect(parsed).toHaveProperty("nameServers");
        expect(parsed).toHaveProperty("rawData");
        expect(parsed.rawData).toBe(rawData);

        // Domain name might not be present for unregistered domains
        // This is expected behavior
      },
      TIMEOUT,
    );
  });

  describe("different TLD formats", () => {
    it(
      "should handle .io domains",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.nic.io",
          "github.io",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed).toBeDefined();
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );

    it(
      "should handle .co domains",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.nic.co",
          "google.co",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed).toBeDefined();
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );

    it(
      "should handle .dev domains",
      async () => {
        const rawData = await executeWhoisQuery(
          "whois.nic.google",
          "example.dev",
          TIMEOUT,
        );

        const parsed = parseWhoisData(rawData);

        expect(parsed).toBeDefined();
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );
  });

  describe("error scenarios", () => {
    it(
      "should timeout on slow servers",
      async () => {
        // Use a very short timeout to force a timeout
        await expect(
          executeWhoisQuery("whois.verisign-grs.com", "google.com", 1),
        ).rejects.toThrow("WHOIS query timeout");
      },
      5000,
    );

    it(
      "should handle connection refused errors",
      async () => {
        // Try to connect to localhost on port 43 (WHOIS port)
        // If nothing is listening, it should throw ECONNREFUSED
        await expect(
          executeWhoisQuery("127.0.0.1", "test.com", 2000),
        ).rejects.toThrow();
      },
      5000,
    );
  });

  describe("special characters and IDN", () => {
    it(
      "should handle punycode domains",
      async () => {
        // xn--e1afmkfd.xn--p1ai is пример.рф (example in Russian)
        const rawData = await executeWhoisQuery(
          "whois.tcinet.ru",
          "xn--e1afmkfd.xn--p1ai",
          TIMEOUT,
        );

        expect(rawData).toBeTruthy();

        const parsed = parseWhoisData(rawData);
        expect(parsed).toBeDefined();
        expect(parsed.rawData).toBe(rawData);
      },
      TIMEOUT,
    );
  });

  describe("data consistency", () => {
    it(
      "should maintain data integrity through full pipeline",
      async () => {
        const domain = "google.com";
        const server = "whois.verisign-grs.com";

        // Query
        const rawData = await executeWhoisQuery(server, domain, TIMEOUT);

        // Parse
        const parsed = parseWhoisData(rawData);

        // Verify raw data is preserved
        expect(parsed.rawData).toBe(rawData);

        // Verify parsed data matches raw data content
        if (parsed.domainName) {
          expect(rawData.toLowerCase()).toContain(parsed.domainName);
        }

        if (parsed.registrar) {
          expect(rawData.toLowerCase()).toContain(
            parsed.registrar.toLowerCase(),
          );
        }

        if (parsed.nameServers && parsed.nameServers.length > 0) {
          // At least one nameserver should be in the raw data
          const hasNameServer = parsed.nameServers.some((ns) =>
            rawData.toLowerCase().includes(ns.toLowerCase()),
          );
          expect(hasNameServer).toBe(true);
        }
      },
      TIMEOUT,
    );
  });
});
