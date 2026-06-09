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

function normalizeClerkUserId(userId: string | undefined) {
  const normalized = userId?.trim()

  return normalized === "" ? undefined : normalized
}
