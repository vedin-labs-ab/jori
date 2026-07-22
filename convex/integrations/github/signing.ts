import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"

export async function createSignedGitHubState(state: ProviderInstallState) {
  return await createSignedState(requireGitHubWebhookSecret(), state)
}

export async function parseSignedGitHubState(value: string) {
  return await parseSignedState<ProviderInstallState>({
    secret: requireGitHubWebhookSecret(),
    value,
    errorLabel: "GitHub",
  })
}

export async function verifyGitHubRequest(_request: Request, body: string) {
  const signature = _request.headers.get("x-hub-signature-256")

  if (signature === null || !signature.startsWith("sha256=")) {
    return false
  }

  const expected = `sha256=${await hmacSha256Hex(
    requireGitHubWebhookSecret(),
    body
  )}`

  return timingSafeEqual(signature, expected)
}

function requireGitHubWebhookSecret() {
  return requireEnvironmentVariable("GITHUB_WEBHOOK_SECRET")
}
