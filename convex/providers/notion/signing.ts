import { createSignedState, parseSignedState } from "../signing"
import { requireNotionClientSecret } from "./oauth"

export type NotionInstallState = {
  tenantId: string
  createdBy: string
  returnUrl: string
  createdAt: number
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
