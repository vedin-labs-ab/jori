import { type Doc } from "../_generated/dataModel"

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

type TokenShape = {
  access?: "string"
  refresh?: "string"
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
  Required extends CredentialShape,
  Optional extends CredentialShape = Record<never, never>,
  Tokens extends TokenShape = { access: "string"; refresh: "string" },
>(
  integration: Doc<"integrations">,
  shape: {
    required?: Required
    optional?: Optional
    tokens?: {
      required?: Tokens
      optional?: TokenShape
    }
  },
  errorMessage: string
): CredentialResult<Required, Optional> & {
  tokens: TokenResult<Tokens> & Partial<TokenResult<TokenShape>>
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
      }) as Tokens,
      shape.tokens?.optional ?? {},
      errorMessage
    ) as TokenResult<Tokens> & Partial<TokenResult<TokenShape>>,
  }
}

type TokenResult<Tokens extends TokenShape> = {
  [Key in keyof Tokens]: Tokens[Key] extends "string" ? string : never
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
