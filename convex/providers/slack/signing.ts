import { type Id } from "../../_generated/dataModel"
import { timingSafeEqual } from "../../shared/crypto"
import { createSignedState, hmacSha256Hex, parseSignedState } from "../signing"

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET

export type SlackInstallState = {
  tenantId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export function requireSlackSigningSecret() {
  if (slackSigningSecret === undefined) {
    throw new Error("Missing SLACK_SIGNING_SECRET")
  }

  return slackSigningSecret
}

export async function createSignedSlackState(state: SlackInstallState) {
  return await createSignedState(requireSlackSigningSecret(), state)
}

export async function parseSignedSlackState(value: string) {
  return await parseSignedState<SlackInstallState>({
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
