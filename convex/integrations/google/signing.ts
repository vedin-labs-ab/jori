import { type Id } from "../../_generated/dataModel"
import { createSignedState, parseSignedState } from "../connect/signing"
import { type GoogleIntegration } from "./config"
import { requireGoogleClientSecret } from "./oauth"

export type GoogleInstallState = {
  integration: GoogleIntegration
  organizationId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedGoogleState(state: GoogleInstallState) {
  return await createSignedState(requireGoogleClientSecret(), state)
}

export async function parseSignedGoogleState(value: string) {
  return await parseSignedState<GoogleInstallState>({
    secret: requireGoogleClientSecret(),
    value,
    errorLabel: "Google Workspace",
  })
}
