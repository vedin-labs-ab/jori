import { type Infer, v } from "convex/values"
import {
  normalizeVisibility,
  type Visibility,
} from "../../contracts/permissions/visibility"

// The stored shape of contracts/permissions/visibility: who may see a
// material or folder. Visibility gates reading; every write additionally
// requires organization membership, so "public" never grants anonymous
// writes. Team ids are Better Auth `team` document ids — stable strings
// owned by the auth component, resolved against live `teamMember` rows.

export const visibilityValidator = v.union(
  v.object({ mode: v.literal("private") }),
  v.object({
    mode: v.literal("people"),
    personIds: v.array(v.id("persons")),
  }),
  v.object({
    mode: v.literal("teams"),
    teamIds: v.array(v.string()),
  }),
  v.object({ mode: v.literal("organization") }),
  v.object({ mode: v.literal("public") })
)

export type StoredVisibility = Infer<typeof visibilityValidator>

/** Legacy rows still carry the binary scope; the one-shot migration in
 *  visibility/migrate.ts stamps `visibility` and clears `scope`, after
 *  which both optionals tighten in a follow-up commit. */
export type VisibilityCarrier = {
  visibility?: StoredVisibility
  scope?: "personal" | "organization"
}

/** The single read path for a material's or folder's visibility: the
 *  stored grant when stamped, the legacy scope's mapping meanwhile, and
 *  the organization default where neither was ever set. */
export function readVisibility(carrier: VisibilityCarrier): StoredVisibility {
  if (carrier.visibility !== undefined) {
    return carrier.visibility
  }

  return carrier.scope === "personal"
    ? { mode: "private" }
    : { mode: "organization" }
}

/** Dedupes grant lists and collapses empty ones to private before a write;
 *  the id types survive the runtime-neutral contract round-trip. */
export function normalizeStoredVisibility(
  visibility: Visibility
): StoredVisibility {
  return normalizeVisibility(visibility) as StoredVisibility
}

/** Agent-facing creation input keeps the personal/organization vocabulary:
 *  materials belong to the whole organization unless made personal, which
 *  maps to private visibility. Grants and public visibility are set by
 *  people in the console. */
export function visibilityFromScopeInput(value: unknown): StoredVisibility {
  return value === "personal" ? { mode: "private" } : { mode: "organization" }
}
