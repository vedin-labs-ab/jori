import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import { readNumber, readRecord } from "../../shared/input"
import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"
import { requireLinearClientSecret } from "./oauth"

export async function createSignedLinearState(state: ProviderInstallState) {
  return await createSignedState(requireLinearClientSecret(), state)
}

export async function parseSignedLinearState(value: string) {
  return await parseSignedState<ProviderInstallState>({
    secret: requireLinearClientSecret(),
    value,
    errorLabel: "Linear",
  })
}

export async function verifyLinearRequest(request: Request, body: string) {
  const signature = request.headers.get("linear-signature")

  if (signature === null) {
    return false
  }

  const expected = await hmacSha256Hex(requireLinearWebhookSecret(), body)
  const normalizedSignature = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature

  if (!timingSafeEqual(normalizedSignature, expected)) {
    return false
  }

  try {
    const timestamp = readNumber(
      readRecord(JSON.parse(body)),
      "webhookTimestamp"
    )
    return timestamp !== undefined && Math.abs(Date.now() - timestamp) <= 60_000
  } catch {
    return false
  }
}

function requireLinearWebhookSecret() {
  return requireEnvironmentVariable("LINEAR_WEBHOOK_SECRET")
}
