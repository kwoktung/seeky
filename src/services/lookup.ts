import { BaseService } from "./service";
import { Socket } from "net";

export interface WhoisData {
  domainName?: string;
  registryDomainId?: string;
  registrarWhoisServer?: string;
  registrarUrl?: string;
  updatedDate?: string;
  creationDate?: string;
  registryExpiryDate?: string;
  registrar?: string;
  registrarIanaId?: string;
  registrarAbuseContactEmail?: string;
  registrarAbuseContactPhone?: string;
  domainStatus?: string;
  nameServers?: string[];
  dnssec?: string;
  rawData?: string;
}

export class LookupService extends BaseService {
  private readonly WHOIS_PORT = 43;
  private readonly TIMEOUT = 10000; // 10 seconds

  // Mapping of TLDs to their respective WHOIS servers
  private readonly TLD_WHOIS_SERVERS: Record<string, string> = {
    // Generic TLDs
    com: "whois.verisign-grs.com",
    net: "whois.verisign-grs.com",
    edu: "whois.verisign-grs.com",
    org: "whois.publicinterestregistry.org",
    info: "whois.afilias.net",
    biz: "whois.biz",

    // Country code TLDs
    uk: "whois.nic.uk",
    ca: "whois.cira.ca",
    au: "whois.auda.org.au",
    nz: "whois.srs.net.nz",
    in: "whois.registry.in",
    de: "whois.denic.de",
    fr: "whois.nic.fr",
    eu: "whois.eu",

    // New TLDs
    ai: "whois.nic.ai",
    io: "whois.nic.io",
    xyz: "whois.nic.xyz",
    co: "whois.registry.co",
    me: "whois.nic.me",
    tv: "whois.nic.tv",
    cc: "whois.nic.cc",
    ws: "whois.website.ws",
    be: "whois.dns.be",
    it: "whois.nic.it",
    nl: "whois.domain-registry.nl",
    us: "whois.nic.us",
    mobi: "whois.dotmobiregistry.net",
    asia: "whois.nic.asia",
  };

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

    return this.parseWhoisData(rawData);
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
   * Get the appropriate WHOIS server for a given domain
   */
  private getWhoisServer(domain: string): string {
    const tld = this.extractTLD(domain);
    const whoisServer = this.TLD_WHOIS_SERVERS[tld];
    if (!whoisServer) {
      throw new Error("Not supported TLD");
    }
    return whoisServer;
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
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let data = "";
      const whoisServer = this.getWhoisServer(domain);

      // Set timeout
      socket.setTimeout(this.TIMEOUT);

      socket.on("connect", () => {
        socket.write(`${domain}\r\n`);
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

      socket.connect(this.WHOIS_PORT, whoisServer);
    });
  }

  /**
   * Parse raw WHOIS data into structured format
   */
  private parseWhoisData(rawData: string): WhoisData {
    const lines = rawData.split("\n");
    const result: WhoisData = {
      nameServers: [],
      rawData,
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (
        !trimmedLine ||
        trimmedLine.startsWith(">>>") ||
        trimmedLine.startsWith("NOTICE:") ||
        trimmedLine.startsWith("TERMS OF USE:")
      ) {
        continue;
      }

      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      if (!value) continue;

      switch (key) {
        case "Domain Name":
          result.domainName = value;
          break;
        case "Registry Domain ID":
          result.registryDomainId = value;
          break;
        case "Registrar WHOIS Server":
          result.registrarWhoisServer = value;
          break;
        case "Registrar URL":
          result.registrarUrl = value;
          break;
        case "Updated Date":
          result.updatedDate = value;
          break;
        case "Creation Date":
          result.creationDate = value;
          break;
        case "Registry Expiry Date":
          result.registryExpiryDate = value;
          break;
        case "Registrar":
          result.registrar = value;
          break;
        case "Registrar IANA ID":
          result.registrarIanaId = value;
          break;
        case "Registrar Abuse Contact Email":
          result.registrarAbuseContactEmail = value;
          break;
        case "Registrar Abuse Contact Phone":
          result.registrarAbuseContactPhone = value;
          break;
        case "Domain Status":
          result.domainStatus = value;
          break;
        case "Name Server":
          if (result.nameServers) {
            result.nameServers.push(value);
          }
          break;
        case "DNSSEC":
          result.dnssec = value;
          break;
      }
    }

    return result;
  }

  /**
   * Validate domain format
   */
  validateDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }
}
