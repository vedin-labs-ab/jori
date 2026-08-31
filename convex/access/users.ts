import { optionalString } from "../shared/input"

/** Claim readers for the Convex identity minted by Better Auth. The claim
 *  set is owned by `definePayload` in convex/auth.ts. */
type Identity = {
  email?: string
  name?: string
  subject?: string
}

export function requireUserId(identity: Identity) {
  const userId = optionalString(identity.subject)

  if (userId === undefined) {
    throw new Error("Authenticated user is missing a user ID")
  }

  return userId
}

/** The caller's display profile, as carried on the identity claims. */
export function readUserProfile(identity: Identity) {
  return {
    email: optionalString(identity.email),
    name: optionalString(identity.name),
  }
}

export function readOrganizationClaim(identity: Record<string, unknown>) {
  return optionalString(identity.org)
}
