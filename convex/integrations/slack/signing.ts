import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"

export function requireSlackSigningSecret() {
  return requireEnvironmentVariable("SLACK_SIGNING_SECRET")
}

export async function createSignedSlackState(state: ProviderInstallState) {
  return await createSignedState(requireSlackSigningSecret(), state)
}

export async function parseSignedSlackState(value: string) {
  return await parseSignedState<ProviderInstallState>({
    secret: requireSlackSigningSecret(),
    value,
    errorLabel: "Slack",
  })
}

export async function verifySlackRequest(request: Request, body: string) {
  const timestamp = request.headers.get("x-slack-request-timestamp")
  const signature = request.headers.get("x-slack-signature")

  if (timestamp === null || signature === null) {
    return false
  }

  const seconds = Number(timestamp)

  if (!Number.isFinite(seconds)) {
    return false
  }

  const requestAge = Math.abs(Date.now() / 1000 - seconds)

  if (requestAge > 60 * 5) {
    return false
  }

  const base = `v0:${timestamp}:${body}`
  const expected = `v0=${await hmacSha256Hex(requireSlackSigningSecret(), base)}`

  return timingSafeEqual(signature, expected)
}
