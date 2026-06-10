import { readProviderDataString } from "../data"

export function getNotionBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export function getNotionOwnerEmail(data: unknown) {
  return readProviderDataString(data, "owner", "user", "person", "email")
}
