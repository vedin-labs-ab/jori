const agentModelProviders = ["openrouter", "baseten"] as const

export type AgentModelProvider = (typeof agentModelProviders)[number]

export type BasetenRuntimeConfig = {
  apiKey: string
  endpoint: string
  model: string
}

export type OpenRouterRuntimeConfig = {
  apiKey: string
  appName: string
  appUrl?: string
}

export function requireAgentModelProvider(): AgentModelProvider {
  const provider = readEnvironmentVariable("MILO_AGENT_MODEL_PROVIDER")

  if (provider === undefined) {
    return "openrouter"
  }

  if (isAgentModelProvider(provider)) {
    return provider
  }

  throw new Error(`Unsupported MILO_AGENT_MODEL_PROVIDER: ${provider}`)
}

export function requireBasetenRuntimeConfig(): BasetenRuntimeConfig {
  const apiKey = readEnvironmentVariable("BASETEN_API_KEY")

  if (apiKey === undefined) {
    throw new Error("Missing BASETEN_API_KEY")
  }

  return {
    apiKey,
    endpoint: "https://inference.baseten.co/v1/chat/completions",
    model: "zai-org/GLM-5.2",
  }
}

export function requireOpenRouterRuntimeConfig(): OpenRouterRuntimeConfig {
  const apiKey = readEnvironmentVariable("OPENROUTER_API_KEY")

  if (apiKey === undefined) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  return {
    apiKey,
    appName: readEnvironmentVariable("OPENROUTER_APP_TITLE") ?? "Milo",
    appUrl:
      readEnvironmentVariable("OPENROUTER_HTTP_REFERER") ??
      readEnvironmentVariable("CONVEX_SITE_URL") ??
      readEnvironmentVariable("VITE_CONVEX_SITE_URL"),
  }
}

export function readEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()

  return value === "" ? undefined : value
}

function isAgentModelProvider(value: string): value is AgentModelProvider {
  return agentModelProviders.includes(value as AgentModelProvider)
}
