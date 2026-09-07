import {
  readEnvironmentVariable,
  requireEnvironmentVariable,
} from "../shared/environment"
import { requireRegion } from "../shared/origin"

/** The account key and API origin are owned by this deployment. */
export function requireOpenRouterConfig() {
  return {
    apiKey: requireEnvironmentVariable("OPENROUTER_API_KEY"),
    serverURL: `https://${requireRegion()}.openrouter.ai/api/v1`,
    appCategories:
      readEnvironmentVariable("OPENROUTER_APP_CATEGORIES") ?? "cloud-agent",
    appTitle: readEnvironmentVariable("OPENROUTER_APP_TITLE") ?? "Jori",
    httpReferer:
      readEnvironmentVariable("OPENROUTER_HTTP_REFERER") ??
      readEnvironmentVariable("CONVEX_SITE_URL"),
  }
}
