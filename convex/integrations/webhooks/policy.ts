export const webhookLeaseMs = 15 * 60_000
export const webhookRetentionMs = 7 * 24 * 60 * 60_000
export const webhookMaxAttempts = 8

export function webhookRetryDelay(attempt: number) {
  return Math.min(15 * 60_000, 5_000 * 4 ** (attempt - 1))
}
