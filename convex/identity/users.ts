type ClerkIdentity = {
  subject?: string
}

export function getClerkUserId(identity: ClerkIdentity) {
  return normalizeClerkUserId(identity.subject)
}

export function requireClerkUserId(identity: ClerkIdentity) {
  const userId = getClerkUserId(identity)

  if (userId === undefined) {
    throw new Error("Authenticated Clerk user is missing a user ID")
  }

  return userId
}

export function readClerkOrganizationId(identity: Record<string, unknown>) {
  const candidates = [
    readNestedIdentityString(identity, "o", "id"),
    identity["o.id"],
    identity.org,
    identity.orgId,
    identity.org_id,
    identity.organizationId,
    identity.organization_id,
    identity["https://clerk.com/org_id"],
  ]

  return candidates.find((candidate) => typeof candidate === "string")
}

function normalizeClerkUserId(userId: string | undefined) {
  const normalized = userId?.trim()

  return normalized === "" ? undefined : normalized
}

function readNestedIdentityString(
  identity: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  const value = identity[key]

  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const nestedValue = (value as Record<string, unknown>)[nestedKey]

  return typeof nestedValue === "string" ? nestedValue : undefined
}
