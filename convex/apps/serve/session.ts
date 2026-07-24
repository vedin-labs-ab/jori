import { type Id } from "../../_generated/dataModel"

export const appSessionDurationMs = 60 * 60 * 1000

export type AppSessionTokenPayload = {
  appId: Id<"apps">
  expiresAt: number
  secret: string
  sessionId: Id<"appSessions">
  organizationId: string
  personId: Id<"persons">
  versionId: Id<"appVersions">
}

export function createSessionTokenPayload(payload: AppSessionTokenPayload) {
  return encodeURIComponent(JSON.stringify(payload))
}

/** Encode a stored session record as the bearer token the shell presents.
 *  Maps field by field so callers can pass wider records without leaking
 *  extra keys into the token. */
export function createSessionToken(record: AppSessionTokenPayload) {
  return createSessionTokenPayload({
    appId: record.appId,
    expiresAt: record.expiresAt,
    secret: record.secret,
    sessionId: record.sessionId,
    organizationId: record.organizationId,
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
      typeof parsed.appId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.secret !== "string" ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.personId !== "string" ||
      typeof parsed.versionId !== "string"
    ) {
      return null
    }

    return parsed as AppSessionTokenPayload
  } catch {
    return null
  }
}

export function createSessionAuthorizationArgs(
  payload: AppSessionTokenPayload,
  now: number
) {
  return {
    sessionId: payload.sessionId,
    appId: payload.appId,
    versionId: payload.versionId,
    organizationId: payload.organizationId,
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
