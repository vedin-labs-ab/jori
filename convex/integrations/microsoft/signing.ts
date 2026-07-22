import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"
import { type MicrosoftIntegration } from "./config"
import { requireMicrosoftClientSecret } from "./oauth"

export type MicrosoftInstallState = ProviderInstallState & {
  integration: MicrosoftIntegration
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
