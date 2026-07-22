import { isRegion, type Region } from "@contracts/region"
import { type RegionConfig } from "./config"

const preferenceCookie = "milo_region"
const preferenceMaxAgeSeconds = 60 * 60 * 24 * 365

export function readRegionPreference(request: Request, config: RegionConfig) {
  const header = request.headers.get("cookie")

  if (header === null) {
    return undefined
  }

  for (const part of header.split(";")) {
    const [name, ...valueParts] = part.trim().split("=")

    if (name !== preferenceCookie) {
      continue
    }

    const value = valueParts.join("=")

    return isRegion(value) && config.enabled.has(value) ? value : undefined
  }

  return undefined
}

export function regionPreferenceHeader(region: Region, publicOrigin: string) {
  const secure = new URL(publicOrigin).protocol === "https:" ? "; Secure" : ""

  return `${preferenceCookie}=${region}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${preferenceMaxAgeSeconds}${secure}`
}
