export const providers = [
  "google",
  "microsoft",
  "github",
  "slack",
  "notion",
  "linear",
] as const

export type Provider = (typeof providers)[number]

const providerLabels: Record<Provider, string> = {
  google: "Google",
  microsoft: "Microsoft",
  github: "GitHub",
  slack: "Slack",
  notion: "Notion",
  linear: "Linear",
}

export function providerLabel(provider: string | undefined) {
  if (provider === undefined) {
    return "Unknown provider"
  }

  return providerLabels[provider as Provider] ?? provider
}
