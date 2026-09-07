import { type Id } from "../../_generated/dataModel"
import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { base64UrlDecode, base64UrlEncode } from "../../shared/encoding"

export type ProviderInstallState = {
  attemptId: Id<"integrationInstalls">
  organizationId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedState<State>(secret: string, state: State) {
  const payload = base64UrlEncode(JSON.stringify(state))
  const signature = await hmacSha256Hex(secret, payload)

  return `${payload}.${signature}`
}

export async function parseSignedState<State>(args: {
  secret: string
  value: string
  errorLabel: string
}) {
  const [payload, signature] = args.value.split(".")

  if (payload === undefined || signature === undefined) {
    throw new Error(`Invalid ${args.errorLabel} state`)
  }

  const expectedSignature = await hmacSha256Hex(args.secret, payload)

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw new Error(`Invalid ${args.errorLabel} state signature`)
  }

  return JSON.parse(base64UrlDecode(payload)) as State
}
