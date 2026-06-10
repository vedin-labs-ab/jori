import { readProviderDataString } from "../data"

export function getNotionBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}
