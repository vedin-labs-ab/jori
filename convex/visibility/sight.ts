import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type StoredVisibility } from "./schema"
import { loadPersonTeamIds } from "./viewer"

// The one resolver that answers "can this viewer see this material or
// folder". Every read surface — console lists, folder contents, MCP tools,
// share links, exports — routes through a Sight.
//
// Semantics: a viewer sees a material when they own it, or when they are
// allowed by the material's own visibility AND by every ancestor folder's
// visibility. A folder behaves the same with its creator as owner.
// "Organization" allows any member; grants allow the listed people or live
// team members; "private" allows the owner alone. The owner override keeps
// a person's own materials visible to them wherever they are filed.
//
// Handing a material outward is the one question the owner override does
// not settle: canShare demands the folder chain too, so a material filed
// into a folder that excludes people cannot leave through a link its
// owner mints.

/** Deeper chains than the folder tree allows read as broken and closed. */
const chainCap = 16

export type SightArgs = {
  organizationId: string
  /** Absent for organization-principal executions, which act for the whole
   *  organization and see everything a plain member sees. */
  personId?: Id<"persons">
}

export type Gate = {
  organizationId: string
  visibility: StoredVisibility
  ownerId?: Id<"persons">
  folderId?: Id<"folders">
}

export type Sight = {
  organizationId: string
  personId: Id<"persons"> | undefined
  canSee: (material: Gate) => Promise<boolean>
  canSeeFolder: (folder: Doc<"folders">) => Promise<boolean>
  canShare: (material: Gate) => Promise<boolean>
}

type SightOptions = {
  /** Test seam; production resolution reads live teamMember rows. */
  teams?: () => Promise<ReadonlySet<string>>
}

type SightState = {
  ctx: QueryLikeCtx
  organizationId: string
  personId: Id<"persons"> | undefined
  chains: Map<Id<"folders">, boolean>
  loadTeams: () => Promise<ReadonlySet<string>>
  teams?: Promise<ReadonlySet<string>>
}

/** One Sight per request: team membership loads lazily once, and folder
 *  chain decisions are memoized across every material it checks. */
export function createSight(
  ctx: QueryLikeCtx,
  args: SightArgs,
  options: SightOptions = {}
): Sight {
  const { personId } = args
  const state: SightState = {
    ctx,
    organizationId: args.organizationId,
    personId,
    chains: new Map(),
    loadTeams:
      options.teams ??
      (() =>
        personId === undefined
          ? Promise.resolve(new Set())
          : loadPersonTeamIds(ctx, {
              organizationId: args.organizationId,
              personId,
            })),
  }

  return {
    organizationId: args.organizationId,
    personId,
    canSee: (material) => canSeeMaterial(state, material),
    canSeeFolder: (folder) => canSeeFolderDoc(state, folder),
    canShare: (material) => canShareMaterial(state, material),
  }
}

async function canSeeMaterial(state: SightState, material: Gate) {
  if (material.organizationId !== state.organizationId) {
    return false
  }

  if (owns(state, material.ownerId)) {
    return true
  }

  return (
    (await allows(state, material)) &&
    (await chainAllows(state, material.folderId))
  )
}

/** Minting a share link, and every later read of one: the owner override
 *  still answers the material's own visibility, but never the chain. A
 *  folder that restricts what it holds also stops its holder's owner from
 *  handing it out. */
async function canShareMaterial(state: SightState, material: Gate) {
  if (material.organizationId !== state.organizationId) {
    return false
  }

  return (
    (owns(state, material.ownerId) || (await allows(state, material))) &&
    (await chainAllows(state, material.folderId))
  )
}

async function canSeeFolderDoc(state: SightState, folder: Doc<"folders">) {
  if (folder.organizationId !== state.organizationId) {
    return false
  }

  if (owns(state, folder.createdBy)) {
    return true
  }

  return (
    (await allows(state, folder)) && (await chainAllows(state, folder.parentId))
  )
}

function owns(state: SightState, ownerId: Id<"persons"> | undefined) {
  return state.personId !== undefined && ownerId === state.personId
}

async function allows(
  state: SightState,
  carrier: { visibility: StoredVisibility }
) {
  const { visibility } = carrier

  switch (visibility.mode) {
    case "organization":
      return true
    case "teams":
      return state.personId === undefined
        ? false
        : intersects(await sightTeamIds(state), visibility.teamIds)
    case "people":
      return (
        state.personId !== undefined &&
        visibility.personIds.includes(state.personId)
      )
    case "private":
      return false
  }
}

function sightTeamIds(state: SightState) {
  state.teams ??= state.loadTeams()

  return state.teams
}

/** Walks the ancestor folders once, memoizing the verdict for every folder
 *  on the walked path: a chain is open only when every level allows the
 *  viewer (or the viewer created that level). Missing or foreign parents
 *  end the walk neutrally; a cycle or over-deep chain reads as closed. */
async function chainAllows(
  state: SightState,
  folderId: Id<"folders"> | undefined
) {
  const walked: Id<"folders">[] = []
  let allowed = true
  let current = folderId

  while (current !== undefined) {
    if (walked.includes(current)) {
      allowed = false
      break
    }

    const memo = state.chains.get(current)

    if (memo !== undefined) {
      allowed = memo
      break
    }

    if (walked.length >= chainCap) {
      allowed = false
      break
    }

    walked.push(current)

    const folder = await state.ctx.db.get(current)

    if (folder === null || folder.organizationId !== state.organizationId) {
      break
    }

    if (!(await levelAllows(state, folder))) {
      allowed = false
      break
    }

    current = folder.parentId
  }

  for (const id of walked) {
    state.chains.set(id, allowed)
  }

  return allowed
}

async function levelAllows(state: SightState, folder: Doc<"folders">) {
  return owns(state, folder.createdBy) || (await allows(state, folder))
}

function intersects(left: ReadonlySet<string>, right: readonly string[]) {
  return right.some((value) => left.has(value))
}
