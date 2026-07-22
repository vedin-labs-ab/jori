import { type Region } from "@contracts/region"
import { type RegionConfig } from "./config"

const euCountryCodes = new Set([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
])

export function estimateRegion(request: Request, config: RegionConfig): Region {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry")
  const estimate =
    country !== null && euCountryCodes.has(country.toUpperCase()) ? "eu" : "us"

  return config.enabled.has(estimate) ? estimate : config.current
}
