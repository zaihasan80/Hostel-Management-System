/**
 * Simple in-memory rate limiter for API protection.
 * Limits per-IP request counts to mitigate brute-force & DoS.
 */
type RateBucket = { count: number; resetAt: number }

const buckets = new Map<string, RateBucket>()

// Periodically purge expired buckets (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt < now) buckets.delete(k)
    }
  }, 5 * 60 * 1000).unref?.()
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  if (bucket.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt }
  }

  bucket.count++
  return { ok: true, remaining: maxRequests - bucket.count, resetAt: bucket.resetAt }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
