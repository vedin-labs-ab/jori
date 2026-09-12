import { regionConfig } from "./config"

const marketingPaths = new Set([
  "/",
  "/pricing",
  "/privacy",
  "/dpa",
  "/terms",
  "/trust",
])

export function isMarketingPath(path: string) {
  return marketingPaths.has(path.replace(/\/$/, "") || "/")
}

export function marketingUrl(path = "/") {
  if (!isMarketingPath(path)) {
    throw new Error("Not a marketing path.")
  }
  return new URL(path, regionConfig.publicOrigin).toString()
}
