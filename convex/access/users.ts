/** Claim readers for the Convex identity minted by Better Auth. The claim
 *  set is owned by `definePayload` in convex/auth.ts. */
type Identity = {
  email?: string
  name?: string
  subject?: string
}

export function requireUserId(identity: Identity) {
  const userId = normalizeIdentityString(identity.subject)

  if (userId === undefined) {
    throw new Error("Authenticated user is missing a user ID")
  }

  return userId
}

/** The caller's display profile, as carried on the identity claims. */
export function readUserProfile(identity: Identity) {
  return {
    email: normalizeIdentityString(identity.email),
    name: normalizeIdentityString(identity.name),
  }
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
