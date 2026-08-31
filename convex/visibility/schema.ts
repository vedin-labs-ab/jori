import { type Infer, v } from "convex/values"
import {
  normalizeVisibility,
  type Visibility,
} from "../../contracts/visibility"

// The stored shape of contracts/visibility: who may see a
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

/** Dedupes grant lists and collapses empty ones to private before a write;
 *  the id types survive the runtime-neutral contract round-trip. */
export function normalizeStoredVisibility(
  visibility: Visibility
): StoredVisibility {
  return normalizeVisibility(visibility) as StoredVisibility
}

/** Agent-facing creation input offers the two visibilities an agent can
 *  reason about: private to the requester, or the whole organization.
 *  Grants and public visibility are set by people in the console. */
export function visibilityFromInput(value: unknown): StoredVisibility {
  return value === "private" ? { mode: "private" } : { mode: "organization" }
}
