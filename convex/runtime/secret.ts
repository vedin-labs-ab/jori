import { timingSafeEqual } from "../shared/crypto"
import { requireEnvironmentVariable } from "../shared/environment"

export function requireWorkerSecret(secret: string) {
  const expected = requireEnvironmentVariable("MILO_WORKER_SECRET")

  if (!timingSafeEqual(secret, expected)) {
    throw new Error("Invalid Milo worker secret")
  }
}
