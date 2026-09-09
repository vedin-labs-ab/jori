import {
  type Provider,
  providerForIntegration,
} from "../../../contracts/integrations"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type CredentialSnapshot, matchesCredentialSnapshot } from "./snapshot"

type CredentialField = "number" | "string"
type CredentialShape = Record<string, CredentialField>
type CredentialValue<Field extends CredentialField> = Field extends "number"
  ? number
  : string
type CredentialResult<
  Required extends CredentialShape,
  Optional extends CredentialShape,
> = {
  [Key in keyof Required]: CredentialValue<Required[Key]>
} & {
  [Key in keyof Optional]?: CredentialValue<Optional[Key]>
}

export function requireCredentials<
  Required extends CredentialShape,
  Optional extends CredentialShape = Record<never, never>,
>(
  integration: Doc<"integrations">,
  shape: {
    required: Required
    optional?: Optional
  },
  errorMessage: string
): CredentialResult<Required, Optional> {
  const credentials = integration.credentials

  if (!isCredentialObject(credentials)) {
    throw new Error(errorMessage)
  }

  return readCredentialFields(
    credentials,
    shape.required,
    shape.optional ?? ({} as Optional),
    errorMessage
  )
}

export function requireTokenCredentials<
  Required extends CredentialShape = Record<never, never>,
  Optional extends CredentialShape = Record<never, never>,
  RequiredTokens extends CredentialShape = {
    access: "string"
    refresh: "string"
  },
  OptionalTokens extends CredentialShape = Record<never, never>,
>(
  integration: Doc<"integrations">,
  shape: {
    required?: Required
    optional?: Optional
    tokens?: {
      required?: RequiredTokens
      optional?: OptionalTokens
    }
  },
  errorMessage: string
): CredentialResult<Required, Optional> & {
  tokens: CredentialResult<RequiredTokens, OptionalTokens>
} {
  const credentials = integration.credentials

  if (
    !isCredentialObject(credentials) ||
    !isCredentialObject(credentials.tokens)
  ) {
    throw new Error(errorMessage)
  }

  return {
    ...readCredentialFields(
      credentials,
      shape.required ?? ({} as Required),
      shape.optional ?? ({} as Optional),
      errorMessage
    ),
    tokens: readCredentialFields(
      credentials.tokens,
      (shape.tokens?.required ?? {
        access: "string",
        refresh: "string",
      }) as RequiredTokens,
      shape.tokens?.optional ?? ({} as OptionalTokens),
      errorMessage
    ),
  }
}

function readCredentialFields<
  Required extends CredentialShape,
  Optional extends CredentialShape,
>(
  credentials: Record<string, unknown>,
  required: Required,
  optional: Optional,
  errorMessage: string
): CredentialResult<Required, Optional> {
  const result: Record<string, number | string | undefined> = {}

  for (const [key, type] of Object.entries(required)) {
    const value = credentials[key]

    if (typeof value !== type) {
      throw new Error(errorMessage)
    }

    result[key] = value as number | string
  }

  for (const [key, type] of Object.entries(optional)) {
    const value = credentials[key]

    result[key] = typeof value === type ? (value as number | string) : undefined
  }

  return result as CredentialResult<Required, Optional>
}

function isCredentialObject(
  credentials: Doc<"integrations">["credentials"]
): credentials is Record<string, unknown> {
  return typeof credentials === "object" && credentials !== null
}

export function requireRefreshToken(
  refreshToken: string | undefined,
  credentials: unknown,
  errorMessage: string
) {
  const resolved = refreshToken ?? readRefreshToken(credentials)

  if (resolved === undefined) {
    throw new Error(errorMessage)
  }

  return resolved
}

function readRefreshToken(credentials: unknown) {
  if (
    typeof credentials === "object" &&
    credentials !== null &&
    "tokens" in credentials &&
    typeof credentials.tokens === "object" &&
    credentials.tokens !== null &&
    "refresh" in credentials.tokens &&
    typeof credentials.tokens.refresh === "string"
  ) {
    return credentials.tokens.refresh
  }

  return undefined
}

export async function requireProviderIntegration(
  ctx: MutationCtx,
  args: {
    integrationId: Id<"integrations">
    provider: Provider
    label: string
    expectedSnapshot?: CredentialSnapshot
  }
) {
  const integration = await ctx.db.get(args.integrationId)

  if (
    integration === null ||
    providerForIntegration(integration.integration) !== args.provider
  ) {
    throw new Error(`${args.label} integration not found`)
  }

  if (
    args.expectedSnapshot !== undefined &&
    !matchesCredentialSnapshot(integration, args.expectedSnapshot)
  ) {
    throw new Error("Integration connection changed during token refresh")
  }

  return integration
}

export async function saveOAuthCredentials<
  Credentials extends Record<string, unknown>,
>(
  ctx: MutationCtx,
  integrationId: Id<"integrations">,
  credentials: Credentials
) {
  const current = await ctx.db.get(integrationId)
  if (current === null) {
    throw new Error("Integration not found")
  }
  await ctx.db.patch(integrationId, {
    credentials,
    credentialVersion: (current.credentialVersion ?? 0) + 1,
    updatedAt: Date.now(),
  })

  return credentials
}
