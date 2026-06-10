import { createSignedState, parseSignedState } from "../signing"
import { type MicrosoftSurfaceProvider } from "./config"
import { requireMicrosoftClientSecret } from "./oauth"

export type MicrosoftInstallState = {
  provider: MicrosoftSurfaceProvider
  tenantId: string
  createdByUserId: string
  returnUrl: string
  createdAt: number
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
