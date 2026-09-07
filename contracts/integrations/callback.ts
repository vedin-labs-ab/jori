export const integrationCallbackPaths = [
  "/github/install/callback",
  "/github/oauth/callback",
  "/google/oauth/callback",
  "/microsoft-email/oauth/callback",
  "/microsoft-calendar/oauth/callback",
  "/slack/oauth/callback",
  "/linear/oauth/callback",
  "/notion/oauth/callback",
] as const

export function isIntegrationCallbackPath(path: string) {
  return integrationCallbackPaths.some((candidate) => candidate === path)
}
