import { z } from "zod";

/**
 * Zod schema for domain format validation
 * Checks if a string matches the standard domain name format:
 * - Consists of labels separated by dots
 * - Each label can contain alphanumeric characters and hyphens
 * - Must not start or end with a hyphen
 * - TLD must be at least 2 characters
 */
export const domainSchema = z
  .string()
  .regex(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    "Invalid domain format. Expected format: labels separated by dots (e.g., 'example.com'), each label must start and end with alphanumeric characters, can contain hyphens in the middle, and must end with a TLD of at least 2 letters",
  );

/**
 * Validate domain format using Zod
 */
export function isValidDomainFormat(domain: string): boolean {
  return domainSchema.safeParse(domain).success;
}
