const sharedLocalParts = new Set([
  "abuse",
  "admin",
  "billing",
  "contact",
  "hello",
  "help",
  "info",
  "noreply",
  "no-reply",
  "notifications",
  "office",
  "postmaster",
  "sales",
  "security",
  "support",
  "team",
])

export function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

export function identifyingEmail(email: string | undefined) {
  const normalized = normalizeEmail(email)

  if (normalized === undefined || !normalized.includes("@")) {
    return undefined
  }

  const [local, domain] = normalized.split("@", 2)

  if (
    local === "" ||
    domain === "" ||
    sharedLocalParts.has(local.split("+", 1)[0]) ||
    domain === "users.noreply.github.com"
  ) {
    return undefined
  }

  return normalized
}
