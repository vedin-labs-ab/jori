import { type Id } from "../../_generated/dataModel"
import { timingSafeEqual } from "../../shared/crypto"
import { createSignedState, hmacSha256Hex, parseSignedState } from "../signing"

export type GitHubInstallState = {
  tenantId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedGitHubState(state: GitHubInstallState) {
  return await createSignedState(requireGitHubWebhookSecret(), state)
}

export async function parseSignedGitHubState(value: string) {
  return await parseSignedState<GitHubInstallState>({
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
  const secret = process.env.GITHUB_WEBHOOK_SECRET

  if (secret === undefined || secret === "") {
    throw new Error("Missing GITHUB_WEBHOOK_SECRET")
  }

  return secret
}
