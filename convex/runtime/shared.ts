import { timingSafeEqual } from "../shared/crypto"

export function requireWorkerSecret(secret: string) {
  const expected = process.env.MILO_WORKER_SECRET?.trim()

  if (expected === undefined || expected === "") {
    throw new Error("Missing MILO_WORKER_SECRET")
  }

  if (!timingSafeEqual(secret, expected)) {
    throw new Error("Invalid Milo worker secret")
  }
}
