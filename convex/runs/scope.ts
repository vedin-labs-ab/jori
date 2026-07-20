import { type Scope } from "../../contracts/permissions/scope"
import { type Doc } from "../_generated/dataModel"
import { type AudienceScope } from "../shared/audience"

/** Runs predating audience stamping read as person-scoped. */
export function runAudienceScope(
  run: Pick<Doc<"runs">, "scope">
): AudienceScope {
  return run.scope ?? "person"
}

/** Project the internal audience scope onto the shared personal/organization vocabulary. */
export function runScope(run: Pick<Doc<"runs">, "scope">): Scope {
  return runAudienceScope(run) === "organization" ? "organization" : "personal"
}
