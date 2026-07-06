import { timingSafeEqual } from "../shared/crypto"

const maxErrorLength = 2000

export function requireWorkerSecret(secret: string) {
  const expected = process.env.MILO_WORKER_SECRET?.trim()

  if (expected === undefined || expected === "") {
    throw new Error("Missing MILO_WORKER_SECRET")
  }

  if (!timingSafeEqual(secret, expected)) {
    throw new Error("Invalid Milo worker secret")
  }
}

export function formatRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return message.length > maxErrorLength
    ? `${message.slice(0, maxErrorLength)}...`
    : message
}
