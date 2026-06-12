import { normalizeEmail } from "../identities"

export type VerifiedClerkEmail = {
  externalId: string
  email: string
}

export function readVerifiedClerkEmails(profile: unknown) {
  const emailAddresses = readEmailAddresses(profile)
  const seen = new Set<string>()
  const verified: VerifiedClerkEmail[] = []

  for (const emailAddress of emailAddresses) {
    const externalId = readString(emailAddress, "id")
    const email = normalizeEmail(readString(emailAddress, "email_address"))
    const verification = readObject(emailAddress, "verification")
    const verificationStatus = readString(verification, "status")

    if (
      externalId === undefined ||
      email === undefined ||
      verificationStatus !== "verified" ||
      seen.has(externalId)
    ) {
      continue
    }

    seen.add(externalId)
    verified.push({ externalId, email })
  }

  return verified
}

function readEmailAddresses(profile: unknown) {
  if (typeof profile !== "object" || profile === null) {
    return []
  }

  const emailAddresses = (profile as Record<string, unknown>).email_addresses

  return Array.isArray(emailAddresses) ? emailAddresses : []
}

function readObject(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const item = (value as Record<string, unknown>)[key]

  return typeof item === "object" && item !== null ? item : undefined
}

function readString(value: unknown, key: string) {
  if (typeof value !== "object" || value === null) {
    return undefined
  }

  const item = (value as Record<string, unknown>)[key]

  return typeof item === "string" ? item : undefined
}
