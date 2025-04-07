import crypto from "crypto";

/**
 * Hash a password using SHA-256 algorithm
 * @param password The plaintext password to hash
 * @returns The hashed password
 */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}