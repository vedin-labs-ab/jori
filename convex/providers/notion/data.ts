import { readProviderDataString } from "../data"

export function getNotionWorkspaceName(data: unknown) {
  return readProviderDataString(data, "workspaceName")
}

export function getNotionWorkspaceIcon(data: unknown) {
  return readProviderDataString(data, "workspaceIcon")
}

export function getNotionBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export function getNotionOwnerName(data: unknown) {
  return readProviderDataString(data, "owner", "user", "name")
}

export function getNotionOwnerEmail(data: unknown) {
  return readProviderDataString(data, "owner", "user", "person", "email")
}
