// Simple in-memory rate limiter (per-user, per-endpoint)
// No Redis needed — single-instance deployment for launch

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s to prevent memory leak
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now >= entry.resetAt) store.delete(key);
  });
}, 60_000);

export function rateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs: number } {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: entry.resetAt - now };
}
