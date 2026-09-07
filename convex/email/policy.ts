export const retentionMs = 30 * 24 * 60 * 60 * 1000
export const leaseMs = 2 * 60 * 1000
// Bird caches idempotency keys for three hours. Stop before expiration.
export const retryWindowMs = 150 * 60 * 1000
export const maxAttempts = 12

export function retryDelay(attempt: number, retryAfterMs = 0) {
  return Math.max(retryAfterMs, Math.min(60_000 * 2 ** (attempt - 1), 600_000))
}

export function canRetry(
  firstAttemptAt: number,
  attempts: number,
  now: number
) {
  return (
    attempts < maxAttempts && now + leaseMs < firstAttemptAt + retryWindowMs
  )
}
