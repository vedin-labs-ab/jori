/** Claim readers for the Convex identity minted by Better Auth. The claim
 *  set is owned by `definePayload` in convex/auth.ts. */
type Identity = {
  email?: string
  name?: string
  subject?: string
}

export function getUserId(identity: Identity) {
  return normalizeIdentityString(identity.subject)
}

export function requireUserId(identity: Identity) {
  const userId = getUserId(identity)

  if (userId === undefined) {
    throw new Error("Authenticated user is missing a user ID")
  }

  return userId
}

export function readUserEmail(identity: Identity) {
  return normalizeIdentityString(identity.email)
}

export function readUserName(identity: Identity) {
  return normalizeIdentityString(identity.name)
}

export function readOrganizationClaim(identity: Record<string, unknown>) {
  const organizationId = identity.org

  return typeof organizationId === "string"
    ? normalizeIdentityString(organizationId)
    : undefined
}

function normalizeIdentityString(value: string | undefined) {
  const normalized = value?.trim()

  return normalized === "" ? undefined : normalized
}
