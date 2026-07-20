import { type Id } from "../../_generated/dataModel"
import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { requireEnvironmentVariable } from "../../shared/environment"
import { createSignedState, parseSignedState } from "../connect/signing"
import { requireLinearClientSecret } from "./oauth"

export type LinearInstallState = {
  organizationId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedLinearState(state: LinearInstallState) {
  return await createSignedState(requireLinearClientSecret(), state)
}

export async function parseSignedLinearState(value: string) {
  return await parseSignedState<LinearInstallState>({
    secret: requireLinearClientSecret(),
    value,
    errorLabel: "Linear",
  })
}

export async function verifyLinearRequest(_request: Request, body: string) {
  const signature = _request.headers.get("linear-signature")

  if (signature === null) {
    return false
  }

  const expected = await hmacSha256Hex(requireLinearWebhookSecret(), body)
  const normalizedSignature = signature.startsWith("sha256=")
    ? signature.slice("sha256=".length)
    : signature

  return timingSafeEqual(normalizedSignature, expected)
}

function requireLinearWebhookSecret() {
  return requireEnvironmentVariable("LINEAR_WEBHOOK_SECRET")
}
