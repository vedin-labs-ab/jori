import { createSignedState, parseSignedState } from "../signing"
import { requireGoogleClientSecret } from "./oauth"

export type GoogleInstallState = {
  tenantId: string
  createdBy: string
  returnUrl: string
  createdAt: number
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
