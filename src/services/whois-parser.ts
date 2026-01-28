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
  domainStatus?: string[];
  nameServers?: string[];
  dnssec?: string;
  rawData?: string;
}

/**
 * Field name mappings for different WHOIS servers and TLDs
 * Maps various field names to their normalized keys
 */
const FIELD_MAPPINGS: Record<string, string[]> = {
  domainName: [
    "domain name",
    "domain",
    "domain:",
    "domain name:",
  ],
  registryDomainId: [
    "registry domain id",
    "domain id",
  ],
  registrarWhoisServer: [
    "registrar whois server",
    "whois server",
    "whois",
  ],
  registrarUrl: [
    "registrar url",
    "registrar web",
    "url",
  ],
  updatedDate: [
    "updated date",
    "last updated",
    "modified",
    "changed",
    "last modified",
  ],
  creationDate: [
    "creation date",
    "created",
    "registered",
    "registered on",
    "registration date",
  ],
  registryExpiryDate: [
    "registry expiry date",
    "expiry date",
    "expiration date",
    "expires",
    "expires on",
    "paid-till",
  ],
  registrar: [
    "registrar",
    "sponsoring registrar",
  ],
  registrarIanaId: [
    "registrar iana id",
    "iana id",
  ],
  registrarAbuseContactEmail: [
    "registrar abuse contact email",
    "abuse contact email",
    "abuse email",
  ],
  registrarAbuseContactPhone: [
    "registrar abuse contact phone",
    "abuse contact phone",
    "abuse phone",
  ],
  domainStatus: [
    "domain status",
    "status",
    "state",
  ],
  nameServer: [
    "name server",
    "nserver",
    "nameserver",
    "nameservers",
  ],
  dnssec: [
    "dnssec",
    "dnssec status",
  ],
};

/**
 * Normalize field name by removing special characters and converting to lowercase
 */
function normalizeFieldName(field: string): string {
  return field.toLowerCase().trim().replace(/[\s_-]+/g, " ");
}

/**
 * Find the matching field key for a given WHOIS field name
 */
function matchFieldKey(fieldName: string): string | null {
  const normalized = normalizeFieldName(fieldName);

  for (const [key, variations] of Object.entries(FIELD_MAPPINGS)) {
    if (variations.some(v => normalizeFieldName(v) === normalized)) {
      return key;
    }
  }

  return null;
}

/**
 * Extract value from WHOIS line, handling various formats
 * Supports:
 * - "key: value"
 * - "key : value"
 * - "key:value"
 * - "key value" (space-separated)
 */
function extractKeyValue(line: string): { key: string; value: string } | null {
  let colonIndex = line.indexOf(":");

  if (colonIndex !== -1) {
    // Standard "key: value" format
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    return { key, value };
  }

  // Try space-separated format (some registrars use this)
  const spaceMatch = line.match(/^([a-z\s]+?)\s{2,}(.+)$/i);
  if (spaceMatch) {
    return { key: spaceMatch[1].trim(), value: spaceMatch[2].trim() };
  }

  return null;
}

/**
 * Clean up status value by removing extra information in parentheses
 * Example: "clientTransferProhibited https://..." -> "clientTransferProhibited"
 */
function cleanStatusValue(value: string): string {
  // Remove URLs and additional info
  const cleaned = value.split(/\s+https?:\/\//)[0].trim();
  return cleaned;
}

/**
 * Parse raw WHOIS data into structured format
 * Supports multiple WHOIS server formats and TLDs
 */
export function parseWhoisData(rawData: string): WhoisData {
  const lines = rawData.split("\n");
  const result: WhoisData = {
    domainStatus: [],
    nameServers: [],
    rawData,
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines, comments, and common header/footer patterns
    if (
      !trimmedLine ||
      trimmedLine.startsWith("%") ||
      trimmedLine.startsWith("#") ||
      trimmedLine.startsWith(">>>") ||
      trimmedLine.startsWith("NOTICE:") ||
      trimmedLine.startsWith("TERMS OF USE:") ||
      trimmedLine.startsWith(">>>") ||
      trimmedLine.startsWith("--") ||
      trimmedLine.match(/^={3,}/) ||
      trimmedLine.toLowerCase().includes("terms of use") ||
      trimmedLine.toLowerCase().includes("please visit")
    ) {
      continue;
    }

    const parsed = extractKeyValue(trimmedLine);
    if (!parsed || !parsed.value) continue;

    const { key, value } = parsed;
    const fieldKey = matchFieldKey(key);

    if (!fieldKey) continue;

    // Handle special cases
    switch (fieldKey) {
      case "domainName":
        // Only set if not already set (prefer first occurrence)
        if (!result.domainName) {
          result.domainName = value.toLowerCase();
        }
        break;

      case "registryDomainId":
        if (!result.registryDomainId) {
          result.registryDomainId = value;
        }
        break;

      case "registrarWhoisServer":
        if (!result.registrarWhoisServer) {
          result.registrarWhoisServer = value;
        }
        break;

      case "registrarUrl":
        if (!result.registrarUrl) {
          result.registrarUrl = value;
        }
        break;

      case "updatedDate":
        if (!result.updatedDate) {
          result.updatedDate = value;
        }
        break;

      case "creationDate":
        if (!result.creationDate) {
          result.creationDate = value;
        }
        break;

      case "registryExpiryDate":
        if (!result.registryExpiryDate) {
          result.registryExpiryDate = value;
        }
        break;

      case "registrar":
        if (!result.registrar) {
          result.registrar = value;
        }
        break;

      case "registrarIanaId":
        if (!result.registrarIanaId) {
          result.registrarIanaId = value;
        }
        break;

      case "registrarAbuseContactEmail":
        if (!result.registrarAbuseContactEmail) {
          result.registrarAbuseContactEmail = value;
        }
        break;

      case "registrarAbuseContactPhone":
        if (!result.registrarAbuseContactPhone) {
          result.registrarAbuseContactPhone = value;
        }
        break;

      case "domainStatus":
        // Support multiple statuses
        const cleanedStatus = cleanStatusValue(value);
        if (cleanedStatus && !result.domainStatus?.includes(cleanedStatus)) {
          result.domainStatus?.push(cleanedStatus);
        }
        break;

      case "nameServer":
        // Support multiple name servers
        const cleanedNS = value.toLowerCase();
        if (cleanedNS && !result.nameServers?.includes(cleanedNS)) {
          result.nameServers?.push(cleanedNS);
        }
        break;

      case "dnssec":
        if (!result.dnssec) {
          result.dnssec = value;
        }
        break;
    }
  }

  return result;
}
