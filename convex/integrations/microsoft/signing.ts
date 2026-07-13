import { type Id } from "../../_generated/dataModel"
import { createSignedState, parseSignedState } from "../connect/signing"
import { type MicrosoftIntegration } from "./config"
import { requireMicrosoftClientSecret } from "./oauth"

export type MicrosoftInstallState = {
  integration: MicrosoftIntegration
  tenantId: string
  createdBy: Id<"persons">
  returnUrl: string
  createdAt: number
  integrationOfferId?: Id<"integrationOffers">
}

export async function createSignedMicrosoftState(state: MicrosoftInstallState) {
  return await createSignedState(requireMicrosoftClientSecret(), state)
}

export async function parseSignedMicrosoftState(value: string) {
  return await parseSignedState<MicrosoftInstallState>({
    secret: requireMicrosoftClientSecret(),
    value,
    errorLabel: "Microsoft",
  })
}
