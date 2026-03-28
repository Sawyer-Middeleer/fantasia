import { createHmac } from "crypto";

let _sessionSecret: string | undefined;

function getSessionSecret(): string {
  if (!_sessionSecret) {
    const secret = process.env.SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET environment variable is required in production"
      );
    }
    _sessionSecret = secret || "dev-secret-change-in-production";
  }
  return _sessionSecret;
}

// Simple HMAC-signed session token: userId.signature
export function createSessionToken(userId: string): string {
  const sig = createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("hex");
  return `${userId}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSessionSecret())
    .update(userId)
    .digest("hex");
  if (sig !== expected) return null;
  return userId;
}
