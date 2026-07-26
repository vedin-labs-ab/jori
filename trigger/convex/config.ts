export function requireConvexUrl() {
  return requireEnv("CONVEX_URL", "VITE_CONVEX_URL")
}

export function requireConvexSiteUrl() {
  return requireEnv("CONVEX_SITE_URL", "VITE_CONVEX_SITE_URL")
}

export function requireWorkerSecret() {
  return requireEnv("JORI_WORKER_SECRET")
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || process.env[fallback ?? ""]?.trim()

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}
