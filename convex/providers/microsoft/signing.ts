import {
  createSignedState,
  parseSignedState,
  timingSafeEqual,
} from "../signing"
import { requireMicrosoftClientSecret } from "./oauth"

export type MicrosoftInstallState = {
  tenantId: string
  createdBy: string
  returnUrl: string
  createdAt: number
  microsoftTenantId?: string
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

export function verifyMicrosoftClientState(clientState: string | undefined) {
  const expected = process.env.MICROSOFT_GRAPH_CLIENT_STATE

  if (expected === undefined || clientState === undefined) {
    return false
  }

  return timingSafeEqual(clientState, expected)
}
