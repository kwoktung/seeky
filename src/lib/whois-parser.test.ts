import { describe, it, expect } from "vitest";
import { parseWhoisData } from "./whois-parser";

describe("parseWhoisData", () => {
  describe("basic field parsing", () => {
    it("should parse standard WHOIS format with colons", () => {
      const rawData = `
Domain Name: example.com
Registry Domain ID: 123456789_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.example.com
Registrar URL: http://www.example.com
Updated Date: 2024-01-01T00:00:00Z
Creation Date: 2020-01-01T00:00:00Z
Registry Expiry Date: 2025-01-01T00:00:00Z
Registrar: Example Registrar, Inc.
Registrar IANA ID: 123
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registryDomainId).toBe("123456789_DOMAIN_COM-VRSN");
      expect(result.registrarWhoisServer).toBe("whois.example.com");
      expect(result.registrarUrl).toBe("http://www.example.com");
      expect(result.updatedDate).toBe("2024-01-01T00:00:00Z");
      expect(result.creationDate).toBe("2020-01-01T00:00:00Z");
      expect(result.registryExpiryDate).toBe("2025-01-01T00:00:00Z");
      expect(result.registrar).toBe("Example Registrar, Inc.");
      expect(result.registrarIanaId).toBe("123");
      expect(result.rawData).toBe(rawData);
    });

    it("should parse domain name in lowercase", () => {
      const rawData = "Domain Name: EXAMPLE.COM\n";
      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
    });

    it("should parse abuse contact information", () => {
      const rawData = `
Registrar Abuse Contact Email: abuse@example.com
Registrar Abuse Contact Phone: +1.1234567890
      `;

      const result = parseWhoisData(rawData);

      expect(result.registrarAbuseContactEmail).toBe("abuse@example.com");
      expect(result.registrarAbuseContactPhone).toBe("+1.1234567890");
    });

    it("should parse DNSSEC information", () => {
      const rawData = "DNSSEC: unsigned\n";
      const result = parseWhoisData(rawData);

      expect(result.dnssec).toBe("unsigned");
    });
  });

  describe("domain status parsing", () => {
    it("should parse single domain status", () => {
      const rawData = "Domain Status: clientTransferProhibited\n";
      const result = parseWhoisData(rawData);

      expect(result.domainStatus).toEqual(["clientTransferProhibited"]);
    });

    it("should parse multiple domain statuses", () => {
      const rawData = `
Domain Status: clientTransferProhibited
Domain Status: clientUpdateProhibited
Domain Status: clientDeleteProhibited
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainStatus).toEqual([
        "clientTransferProhibited",
        "clientUpdateProhibited",
        "clientDeleteProhibited",
      ]);
    });

    it("should clean status values with URLs", () => {
      const rawData = `
Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
Domain Status: clientUpdateProhibited https://icann.org/epp#clientUpdateProhibited
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainStatus).toEqual([
        "clientTransferProhibited",
        "clientUpdateProhibited",
      ]);
    });

    it("should not duplicate status values", () => {
      const rawData = `
Domain Status: clientTransferProhibited
Domain Status: clientTransferProhibited
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainStatus).toEqual(["clientTransferProhibited"]);
    });

    it("should handle status with alternative field names", () => {
      const rawData = `
Status: active
State: active
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainStatus?.length).toBeGreaterThan(0);
    });
  });

  describe("name server parsing", () => {
    it("should parse single name server", () => {
      const rawData = "Name Server: ns1.example.com\n";
      const result = parseWhoisData(rawData);

      expect(result.nameServers).toEqual(["ns1.example.com"]);
    });

    it("should parse multiple name servers", () => {
      const rawData = `
Name Server: ns1.example.com
Name Server: ns2.example.com
Name Server: ns3.example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.nameServers).toEqual([
        "ns1.example.com",
        "ns2.example.com",
        "ns3.example.com",
      ]);
    });

    it("should normalize name servers to lowercase", () => {
      const rawData = `
Name Server: NS1.EXAMPLE.COM
Name Server: NS2.EXAMPLE.COM
      `;

      const result = parseWhoisData(rawData);

      expect(result.nameServers).toEqual(["ns1.example.com", "ns2.example.com"]);
    });

    it("should not duplicate name servers", () => {
      const rawData = `
Name Server: ns1.example.com
Name Server: ns1.example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.nameServers).toEqual(["ns1.example.com"]);
    });

    it("should handle alternative name server field names", () => {
      const rawData = `
nserver: ns1.example.com
nameserver: ns2.example.com
nameservers: ns3.example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.nameServers?.length).toBeGreaterThan(0);
    });
  });

  describe("field name variations", () => {
    it("should parse domain field variations", () => {
      const variations = [
        { input: "domain name: example.com", expected: "example.com" },
        { input: "domain: example.com", expected: "example.com" },
        { input: "domain : example.com", expected: "example.com" },
      ];

      variations.forEach(({ input, expected }) => {
        const result = parseWhoisData(input);
        expect(result.domainName).toBe(expected);
      });
    });

    it("should parse creation date variations", () => {
      const variations = [
        "Creation Date: 2020-01-01",
        "Created: 2020-01-01",
        "Registered: 2020-01-01",
        "Registered On: 2020-01-01",
        "Registration Date: 2020-01-01",
      ];

      variations.forEach((variation) => {
        const result = parseWhoisData(variation);
        expect(result.creationDate).toBe("2020-01-01");
      });
    });

    it("should parse updated date variations", () => {
      const variations = [
        "Updated Date: 2024-01-01",
        "Last Updated: 2024-01-01",
        "Modified: 2024-01-01",
        "Changed: 2024-01-01",
        "Last Modified: 2024-01-01",
      ];

      variations.forEach((variation) => {
        const result = parseWhoisData(variation);
        expect(result.updatedDate).toBe("2024-01-01");
      });
    });

    it("should parse expiry date variations", () => {
      const variations = [
        "Registry Expiry Date: 2025-01-01",
        "Expiry Date: 2025-01-01",
        "Expiration Date: 2025-01-01",
        "Expires: 2025-01-01",
        "Expires On: 2025-01-01",
        "paid-till: 2025-01-01",
      ];

      variations.forEach((variation) => {
        const result = parseWhoisData(variation);
        expect(result.registryExpiryDate).toBe("2025-01-01");
      });
    });

    it("should handle field names with different spacing", () => {
      const rawData = `
Domain-Name: example.com
Registry_Domain_ID: 12345
Registrar   WHOIS   Server: whois.example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registryDomainId).toBe("12345");
      expect(result.registrarWhoisServer).toBe("whois.example.com");
    });
  });

  describe("comment and header filtering", () => {
    it("should skip lines starting with %", () => {
      const rawData = `
% This is a comment
Domain Name: example.com
% Another comment
Registrar: Example Registrar
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrar).toBe("Example Registrar");
    });

    it("should skip lines starting with #", () => {
      const rawData = `
# Comment line
Domain Name: example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
    });

    it("should skip NOTICE lines", () => {
      const rawData = `
NOTICE: This is a notice
Domain Name: example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
    });

    it("should skip TERMS OF USE lines", () => {
      const rawData = `
TERMS OF USE: By accessing this WHOIS server...
Domain Name: example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
    });

    it("should skip separator lines", () => {
      const rawData = `
====================================
Domain Name: example.com
------------------------------------
Registrar: Example Registrar
>>> Last update
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrar).toBe("Example Registrar");
    });

    it("should skip empty lines", () => {
      const rawData = `

Domain Name: example.com


Registrar: Example Registrar

      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrar).toBe("Example Registrar");
    });
  });

  describe("real-world WHOIS examples", () => {
    it("should parse .com domain WHOIS", () => {
      const rawData = `
   Domain Name: GOOGLE.COM
   Registry Domain ID: 2138514_DOMAIN_COM-VRSN
   Registrar WHOIS Server: whois.markmonitor.com
   Registrar URL: http://www.markmonitor.com
   Updated Date: 2024-09-09T09:01:28Z
   Creation Date: 1997-09-15T04:00:00Z
   Registry Expiry Date: 2028-09-14T04:00:00Z
   Registrar: MarkMonitor Inc.
   Registrar IANA ID: 292
   Registrar Abuse Contact Email: abusecomplaints@markmonitor.com
   Registrar Abuse Contact Phone: +1.2086851750
   Domain Status: clientDeleteProhibited https://icann.org/epp#clientDeleteProhibited
   Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
   Domain Status: clientUpdateProhibited https://icann.org/epp#clientUpdateProhibited
   Domain Status: serverDeleteProhibited https://icann.org/epp#serverDeleteProhibited
   Domain Status: serverTransferProhibited https://icann.org/epp#serverTransferProhibited
   Domain Status: serverUpdateProhibited https://icann.org/epp#serverUpdateProhibited
   Name Server: NS1.GOOGLE.COM
   Name Server: NS2.GOOGLE.COM
   Name Server: NS3.GOOGLE.COM
   Name Server: NS4.GOOGLE.COM
   DNSSEC: unsigned
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("google.com");
      expect(result.registryDomainId).toBe("2138514_DOMAIN_COM-VRSN");
      expect(result.registrar).toBe("MarkMonitor Inc.");
      expect(result.registrarIanaId).toBe("292");
      expect(result.domainStatus).toContain("clientDeleteProhibited");
      expect(result.domainStatus).toContain("serverTransferProhibited");
      expect(result.nameServers).toEqual([
        "ns1.google.com",
        "ns2.google.com",
        "ns3.google.com",
        "ns4.google.com",
      ]);
      expect(result.dnssec).toBe("unsigned");
    });

    it("should parse .ru domain WHOIS format", () => {
      const rawData = `
domain:        EXAMPLE.RU
nserver:       ns1.example.ru.
nserver:       ns2.example.ru.
state:         REGISTERED, DELEGATED, VERIFIED
person:        Private Person
registrar:     RU-CENTER-RU
created:       2010-01-01T21:00:00Z
paid-till:     2025-01-01T21:00:00Z
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.ru");
      expect(result.nameServers).toContain("ns1.example.ru.");
      expect(result.nameServers).toContain("ns2.example.ru.");
      expect(result.registrar).toBe("RU-CENTER-RU");
      expect(result.creationDate).toBe("2010-01-01T21:00:00Z");
      expect(result.registryExpiryDate).toBe("2025-01-01T21:00:00Z");
    });

    it("should parse .uk domain WHOIS format", () => {
      const rawData = `
Domain name: example.co.uk
Registrar: Example Registrar [Tag = EXAMPLE]
URL: http://www.example.com
Registered on: 15-Jan-2000
Expiry date: 15-Jan-2025
Last updated: 14-Jan-2024
Name Server: ns1.example.com
Name Server: ns2.example.com
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.co.uk");
      expect(result.registrarUrl).toBe("http://www.example.com");
      expect(result.nameServers).toContain("ns1.example.com");
      expect(result.nameServers).toContain("ns2.example.com");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = parseWhoisData("");

      expect(result.domainStatus).toEqual([]);
      expect(result.nameServers).toEqual([]);
      expect(result.rawData).toBe("");
    });

    it("should handle malformed data", () => {
      const rawData = `
This is not a valid WHOIS response
Just some random text
Without proper formatting
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainStatus).toEqual([]);
      expect(result.nameServers).toEqual([]);
      expect(result.rawData).toBe(rawData);
    });

    it("should handle data with only comments", () => {
      const rawData = `
% Comment 1
# Comment 2
NOTICE: This is a notice
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBeUndefined();
      expect(result.domainStatus).toEqual([]);
    });

    it("should prefer first occurrence of single-value fields", () => {
      const rawData = `
Domain Name: first.com
Domain Name: second.com
Registrar: First Registrar
Registrar: Second Registrar
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("first.com");
      expect(result.registrar).toBe("First Registrar");
    });

    it("should handle values with special characters", () => {
      const rawData = `
Domain Name: xn--e1afmkfd.xn--p1ai
Registrar: Registrar & Co., Inc.
Registrar URL: https://example.com/path?query=value&other=value
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("xn--e1afmkfd.xn--p1ai");
      expect(result.registrar).toBe("Registrar & Co., Inc.");
      expect(result.registrarUrl).toBe(
        "https://example.com/path?query=value&other=value",
      );
    });

    it("should handle lines with colons in values", () => {
      const rawData = `
Domain Name: example.com
Registrar URL: https://example.com:8080/path
Updated Date: 2024-01-01T00:00:00Z
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrarUrl).toBe("https://example.com:8080/path");
      expect(result.updatedDate).toBe("2024-01-01T00:00:00Z");
    });

    it("should handle whitespace variations in values", () => {
      const rawData = `
Domain Name:    example.com
Registrar:   Example Registrar
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrar).toBe("Example Registrar");
    });

    it("should return all arrays initialized", () => {
      const result = parseWhoisData("Domain Name: example.com");

      expect(Array.isArray(result.domainStatus)).toBe(true);
      expect(Array.isArray(result.nameServers)).toBe(true);
    });
  });

  describe("space-separated format", () => {
    it("should parse space-separated key-value pairs", () => {
      const rawData = `
domain        example.com
registrar     Example Registrar Inc.
      `;

      const result = parseWhoisData(rawData);

      expect(result.domainName).toBe("example.com");
      expect(result.registrar).toBe("Example Registrar Inc.");
    });
  });

  describe("data integrity", () => {
    it("should preserve raw data", () => {
      const rawData = `
Domain Name: example.com
Registrar: Example Registrar
      `;

      const result = parseWhoisData(rawData);

      expect(result.rawData).toBe(rawData);
    });

    it("should return consistent structure", () => {
      const result = parseWhoisData("Domain Name: example.com");

      expect(result).toHaveProperty("domainStatus");
      expect(result).toHaveProperty("nameServers");
      expect(result).toHaveProperty("rawData");
      expect(result).toHaveProperty("domainName");
    });
  });
});
