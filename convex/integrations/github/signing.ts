import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"

export type GitHubInstallState = ProviderInstallState & {
  installationId?: string
}

export async function createGitHubInstallState(
  ctx: MutationCtx,
  state: ProviderInstallState
) {
  const existing = await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (q) =>
      q.eq("organizationId", state.organizationId).eq("integration", "github")
    )
    .order("desc")
    .first()
  return await createSignedGitHubState({
    ...state,
    ...(existing?.status === "active"
      ? { installationId: existing.externalId }
      : {}),
  })
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

export async function verifyGitHubRequest(request: Request, body: string) {
  const signature = request.headers.get("x-hub-signature-256")

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

import { type MutationCtx } from "../../_generated/server"
