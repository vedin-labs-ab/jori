import { v } from "convex/values"

export type AudienceScope = "conversation" | "person" | "tenant"

export const audienceScopeValidator = v.union(
  v.literal("tenant"),
  v.literal("conversation"),
  v.literal("person")
)

/** Convex validator for the shared personal/organization entity scope. */
export const scopeValidator = v.union(
  v.literal("personal"),
  v.literal("organization")
)
