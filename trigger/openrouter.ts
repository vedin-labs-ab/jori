export type OpenRouterRuntimeConfig = {
  apiKey: string
  appName: string
  appUrl?: string
}

export function requireOpenRouterRuntimeConfig(): OpenRouterRuntimeConfig {
  const apiKey = readEnvironmentVariable("OPENROUTER_API_KEY")

  if (apiKey === undefined) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  return {
    apiKey,
    appName: readEnvironmentVariable("OPENROUTER_APP_TITLE") ?? "Jori",
    appUrl:
      readEnvironmentVariable("OPENROUTER_HTTP_REFERER") ??
      readEnvironmentVariable("CONVEX_SITE_URL") ??
      readEnvironmentVariable("VITE_CONVEX_SITE_URL"),
  }
}

function readEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()

  return value === "" ? undefined : value
}
