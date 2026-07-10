import { type Id } from "../../_generated/dataModel"

export const artifactSessionDurationMs = 60 * 60 * 1000

export type ArtifactSessionTokenPayload = {
  artifactId: Id<"artifacts">
  expiresAt: number
  secret: string
  sessionId: Id<"artifactSessions">
  tenantId: string
  personId: Id<"persons">
  versionId: Id<"artifactVersions">
}

export function createSessionTokenPayload(
  payload: ArtifactSessionTokenPayload
) {
  return encodeURIComponent(JSON.stringify(payload))
}

/** Encode a stored session record as the bearer token the shell presents.
 *  Maps field by field so callers can pass wider records without leaking
 *  extra keys into the token. */
export function createSessionToken(record: ArtifactSessionTokenPayload) {
  return createSessionTokenPayload({
    artifactId: record.artifactId,
    expiresAt: record.expiresAt,
    secret: record.secret,
    sessionId: record.sessionId,
    tenantId: record.tenantId,
    personId: record.personId,
    versionId: record.versionId,
  })
}

export function readSessionTokenPayload(token: string) {
  try {
    const parsed = JSON.parse(decodeURIComponent(token))

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.artifactId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.secret !== "string" ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.tenantId !== "string" ||
      typeof parsed.personId !== "string" ||
      typeof parsed.versionId !== "string"
    ) {
      return null
    }

    return parsed as ArtifactSessionTokenPayload
  } catch {
    return null
  }
}

export function createSessionAuthorizationArgs(
  payload: ArtifactSessionTokenPayload,
  now: number
) {
  return {
    sessionId: payload.sessionId,
    artifactId: payload.artifactId,
    versionId: payload.versionId,
    tenantId: payload.tenantId,
    personId: payload.personId,
    secret: payload.secret,
    tokenExpiresAt: payload.expiresAt,
    now,
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")

  if (authorization === null || !authorization.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()

  return token === "" ? null : token
}
