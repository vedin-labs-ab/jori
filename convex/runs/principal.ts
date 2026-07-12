import { type Infer, v } from "convex/values"
import { type Scope } from "../../contracts/permissions/scope"
import { type Id } from "../_generated/dataModel"

export const executionPrincipalValidator = v.union(
  v.object({
    kind: v.literal("person"),
    personId: v.id("persons"),
  }),
  v.object({
    kind: v.literal("organization"),
  })
)

export type ExecutionPrincipal = Infer<typeof executionPrincipalValidator>

export function executionPrincipalForScope(
  scope: Scope,
  personId: Id<"persons"> | undefined
): ExecutionPrincipal {
  if (scope === "organization") {
    return { kind: "organization" }
  }

  if (personId === undefined) {
    throw new Error("Personal execution requires a person.")
  }

  return { kind: "person", personId }
}

export function executionPrincipalPersonId(
  principal: ExecutionPrincipal
): Id<"persons"> | undefined {
  return principal.kind === "person" ? principal.personId : undefined
}

export function executionPrincipalForPerson(
  personId: Id<"persons"> | undefined
): ExecutionPrincipal {
  return personId === undefined
    ? { kind: "organization" }
    : { kind: "person", personId }
}

export function scopeForExecutionPrincipal(
  principal: ExecutionPrincipal
): Scope {
  return principal.kind === "person" ? "personal" : "organization"
}
