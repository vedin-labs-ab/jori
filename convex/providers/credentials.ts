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

  const result: Record<string, number | string | undefined> = {}

  for (const [key, type] of Object.entries(shape.required)) {
    const value = credentials[key]

    if (typeof value !== type) {
      throw new Error(errorMessage)
    }

    result[key] = value as number | string
  }

  for (const [key, type] of Object.entries(shape.optional ?? {})) {
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
