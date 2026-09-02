import { type Infer, v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type StoredVisibility } from "../visibility/schema"

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

/** Private things are one person's; every shared mode belongs to the
 *  organization and executes as it. */
export function executesAsOrganization(visibility: StoredVisibility) {
  return visibility.mode !== "private"
}

/** The identity a material or job runs as, derived from who may see
 *  it: private executes as its person, everything shared as the organization. */
export function executionPrincipalForVisibility(
  visibility: StoredVisibility,
  personId: Id<"persons"> | undefined
): ExecutionPrincipal {
  if (executesAsOrganization(visibility)) {
    return { kind: "organization" }
  }

  if (personId === undefined) {
    throw new Error("Private execution requires a person.")
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
