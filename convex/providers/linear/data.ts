import { readProviderDataString } from "../data"

export function getLinearAppUserId(data: unknown) {
  return readProviderDataString(data, "appUserId")
}
