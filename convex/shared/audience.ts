import { v } from "convex/values"

export type AudienceScope = "conversation" | "person" | "organization"

export const audienceScopeValidator = v.union(
  v.literal("organization"),
  v.literal("conversation"),
  v.literal("person")
)

/** Convex validator for the shared personal/organization entity scope. */
export const scopeValidator = v.union(
  v.literal("personal"),
  v.literal("organization")
)
