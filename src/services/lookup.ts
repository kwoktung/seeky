import { BaseService } from "./service";
import { Socket } from "net";
import whoisServers from "whois-servers-list";
import { WhoisData, parseWhoisData } from "@/lib/whois-parser";

export type { WhoisData };

export class LookupService extends BaseService {
  private readonly WHOIS_PORT = 43;
  private readonly TIMEOUT = 10000; // 10 seconds

  // Runtime cache for dynamically discovered WHOIS servers
  // Note: In Cloudflare Workers, this cache only persists within a single request
  // Useful for bulk lookups to avoid redundant IANA queries for the same TLD
  private serverCache = new Map<string, string>();

  // Default WHOIS server for unknown TLDs
  private readonly DEFAULT_WHOIS_SERVER = "whois.iana.org";

  /**
   * Query domain lookup information for a domain
   */
  async queryDomain(domain: string): Promise<WhoisData | null> {
    const rawData = await this.fetchWhoisData(domain);

    // Check if domain was not found
    if (this.isDomainNotFound(rawData)) {
      return null;
    }

    return parseWhoisData(rawData);
  }

  /**
   * Extract TLD from domain
   */
  private extractTLD(domain: string): string {
    const parts = domain.toLowerCase().split(".");
    if (parts.length < 2) {
      throw new Error("Invalid domain format");
    }
    return parts[parts.length - 1];
  }

  /**
   * Get the appropriate WHOIS server for a given domain using hybrid approach
   * 1. Check static mapping from whois-servers-list (~1,400 TLDs)
   * 2. Check request-scoped cache for previously discovered servers
   * 3. Query IANA for dynamic discovery
   * 4. Fallback to IANA as default
   */
  private async getWhoisServer(domain: string): Promise<string> {
    const tld = this.extractTLD(domain);

    // 1. Try static mapping first (instant lookup - covers ~1,400 TLDs)
    const staticServer = whoisServers[tld as keyof typeof whoisServers];
    if (staticServer) {
      return staticServer;
    }

    // 2. Check request-scoped cache (useful for bulk lookups with same TLD)
    const cached = this.serverCache.get(tld);
    if (cached) {
      return cached;
    }

    // 3. Dynamic discovery via IANA
    try {
      const server = await this.discoverWhoisServer(tld);
      this.serverCache.set(tld, server);
      return server;
    } catch (error) {
      console.error(`Failed to discover WHOIS server for TLD: ${tld}`, error);
      // 4. Final fallback to IANA
      return this.DEFAULT_WHOIS_SERVER;
    }
  }

  /**
   * Discover WHOIS server for a TLD by querying IANA
   */
  private async discoverWhoisServer(tld: string): Promise<string> {
    const ianaResponse = await this.queryWhoisRaw(
      this.DEFAULT_WHOIS_SERVER,
      tld,
    );

    // Parse the "whois:" or "refer:" field from IANA response
    const referMatch = ianaResponse.match(/(?:whois|refer):\s*(.+)/i);
    if (!referMatch) {
      throw new Error(`No WHOIS server found in IANA response for TLD: ${tld}`);
    }

    return referMatch[1].trim();
  }

  /**
   * Query raw WHOIS data from any WHOIS server
   */
  private async queryWhoisRaw(server: string, query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let data = "";

      socket.setTimeout(this.TIMEOUT);

      socket.on("connect", () => {
        socket.write(`${query}\r\n`);
      });

      socket.on("data", (chunk) => {
        data += chunk.toString();
      });

      socket.on("end", () => {
        socket.destroy();
        resolve(data);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("WHOIS query timeout"));
      });

      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });

      socket.connect(this.WHOIS_PORT, server);
    });
  }

  /**
   * Check if the WHOIS data indicates domain not found
   */
  private isDomainNotFound(rawData: string): boolean {
    const notFoundPatterns = [
      /No match for/i,
      /NOT FOUND/i,
      /No Data Found/i,
      /No entries found/i,
      /Domain not found/i,
    ];

    return notFoundPatterns.some((pattern) => pattern.test(rawData));
  }

  /**
   * Fetch raw WHOIS data from the WHOIS server
   */
  private async fetchWhoisData(domain: string): Promise<string> {
    const whoisServer = await this.getWhoisServer(domain);
    return this.queryWhoisRaw(whoisServer, domain);
  }
}
