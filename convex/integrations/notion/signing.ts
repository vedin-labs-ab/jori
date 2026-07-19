import { type Id } from "../../_generated/dataModel"
import { hmacSha256Hex, timingSafeEqual } from "../../shared/crypto"
import { readEnvironmentVariable } from "../../shared/environment"
import { createSignedState, parseSignedState } from "../connect/signing"
import { requireNotionClientSecret } from "./oauth"

export type NotionInstallState = {
  tenantId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedNotionState(state: NotionInstallState) {
  return await createSignedState(requireNotionClientSecret(), state)
}

export async function parseSignedNotionState(value: string) {
  return await parseSignedState<NotionInstallState>({
    secret: requireNotionClientSecret(),
    value,
    errorLabel: "Notion",
  })
}

export async function verifyNotionWebhookRequest(
  request: Request,
  body: string
) {
  const signature = request.headers.get("x-notion-signature")
  const verificationToken = readNotionWebhookVerificationToken()

  if (
    signature === null ||
    verificationToken === undefined ||
    !signature.startsWith("sha256=")
  ) {
    return false
  }

  const expected = `sha256=${await hmacSha256Hex(verificationToken, body)}`

  return timingSafeEqual(signature, expected)
}

function readNotionWebhookVerificationToken() {
  return readEnvironmentVariable("NOTION_WEBHOOK_VERIFICATION_TOKEN")
}
