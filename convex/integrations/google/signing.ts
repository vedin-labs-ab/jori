import {
  createSignedState,
  type ProviderInstallState,
  parseSignedState,
} from "../connect/signing"
import { type GoogleIntegration } from "./config"
import { requireGoogleClientSecret } from "./oauth"

export type GoogleInstallState = ProviderInstallState & {
  integration: GoogleIntegration
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
