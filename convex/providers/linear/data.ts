import { readProviderDataString } from "../data"

export function getLinearBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}
