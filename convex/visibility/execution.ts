import { type QueryLikeCtx } from "../shared/context"
import { listOrganizationViewerIds } from "./audience"
import { createSight, type Gate, type Sight } from "./sight"

/** Workspace credentials and resource visibility are separate. Shared work
 *  may read a resource only when everyone who can see the work can read it.
 *  Resolve the audience once, lazily, and keep each member's folder/team cache. */
export function createAudienceSight(ctx: QueryLikeCtx, gate: Gate): Sight {
  let audience: Promise<Sight[]> | undefined
  const all = async (allows: (sight: Sight) => Promise<boolean>) => {
    audience ??= audienceSights(ctx, gate)
    const viewers = await audience
    if (viewers.length === 0) {
      return false
    }
    for (const viewer of viewers) {
      if (!(await allows(viewer))) {
        return false
      }
    }
    return true
  }

  return {
    organizationId: gate.organizationId,
    personId: undefined,
    canSee: (resource) => all((viewer) => viewer.canSee(resource)),
    canSeeFolder: (folder) => all((viewer) => viewer.canSeeFolder(folder)),
    canShare: (resource) => all((viewer) => viewer.canShare(resource)),
  }
}

async function audienceSights(ctx: QueryLikeCtx, gate: Gate) {
  const viewers = await listOrganizationViewerIds(ctx, gate.organizationId)
  const audience = []
  for (const personId of new Set(viewers)) {
    const sight = createSight(ctx, {
      organizationId: gate.organizationId,
      personId,
    })
    if (await sight.canSee(gate)) {
      audience.push(sight)
    }
  }
  return audience
}
