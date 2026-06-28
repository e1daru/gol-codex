import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function generateClientToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hmacSha256(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifyHash(value: string, expectedHash: string, secret: string): boolean {
  const actualHash = hmacSha256(value, secret);
  const actual = Buffer.from(actualHash);
  const expected = Buffer.from(expectedHash);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function hashClientIp(ipAddress: string, secret: string): string {
  return hmacSha256(ipAddress || "unknown", secret);
}
