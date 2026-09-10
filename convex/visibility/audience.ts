import { type Member } from "better-auth/plugins/organization"
import { type Id } from "../_generated/dataModel"
import { authComponent, createAdapterOptions } from "../auth"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { personDisplay } from "../persons/names"
import { type QueryLikeCtx } from "../shared/context"
import { type StoredVisibility } from "./schema"
import { createSight, type Gate } from "./sight"

// Who a stored visibility actually reaches, resolved against the live
// organization. The console asks this to say "visible to 4 people" instead
// of naming a mode, and to warn before a move changes the answer.
//
// Organizations are capped at memberLimit, so one Sight per member over the
// memoized folder chain is cheap enough to resolve on every keystroke of a
// visibility draft.

const memberLimit = 200

export type OrganizationMember = {
  personId: Id<"persons">
  name: string | undefined
  image: string | undefined
}

/** The organization's members as people the console can name. Members
 *  whose person row has not materialized yet (they have never opened the
 *  console) cannot be granted or counted, and are omitted. */
export async function listOrganizationMembers(
  ctx: QueryLikeCtx,
  organizationId: string
): Promise<OrganizationMember[]> {
  const members = await organizationMembers(ctx, organizationId)
  const people = await Promise.all(
    members.map((member) => toOrganizationMember(ctx, organizationId, member))
  )

  return people
    .filter((person) => person !== undefined)
    .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""))
}

/** Which of those members the gate actually admits. */
export async function resolveAudience(
  ctx: QueryLikeCtx,
  gate: Gate,
  members: readonly OrganizationMember[]
): Promise<OrganizationMember[]> {
  const verdicts = await Promise.all(
    members.map((member) =>
      createSight(ctx, {
        organizationId: gate.organizationId,
        personId: member.personId,
      }).canSee(gate)
    )
  )

  return members.filter((_, index) => verdicts[index] === true)
}

/** What moving this gate into that folder would do to who can see it: the
 *  same audience resolved on both sides of the candidate move. A folder's
 *  own gate answers for everything filed inside it, since the chain it
 *  moves into cascades over its contents. */
export async function compareMove(
  ctx: QueryLikeCtx,
  gate: Gate,
  folderId: Id<"folders"> | undefined,
  members: readonly OrganizationMember[]
) {
  return compareAudiences({
    before: await resolveAudience(ctx, gate, members),
    after: await resolveAudience(ctx, { ...gate, folderId }, members),
    memberCount: members.length,
  })
}

/** What a move does to an audience, in the terms the confirmation speaks:
 *  who drops out, who joins, and whether the move opens the material to
 *  the whole organization. */
export function compareAudiences(args: {
  before: readonly OrganizationMember[]
  after: readonly OrganizationMember[]
  memberCount: number
}) {
  const before = new Set(args.before.map((person) => person.personId))
  const after = new Set(args.after.map((person) => person.personId))

  return {
    losing: args.before.filter((person) => !after.has(person.personId)).length,
    gaining: args.after.filter((person) => !before.has(person.personId)).length,
    becomesOrganizationWide:
      after.size === args.memberCount && before.size < args.memberCount,
  }
}

/** The innermost ancestor folder that narrows what it holds below the
 *  whole organization, named so the console can say where the narrowing
 *  comes from. Null when nothing above the material narrows it. */
export async function narrowingFolderName(
  ctx: QueryLikeCtx,
  organizationId: string,
  folderId: Id<"folders"> | undefined
): Promise<string | null> {
  const walked = new Set<string>()
  let current = folderId

  while (current !== undefined && !walked.has(current)) {
    walked.add(current)

    const folder = await ctx.db.get(current)

    if (folder === null || folder.organizationId !== organizationId) {
      return null
    }

    if (narrows(folder.visibility)) {
      return folder.name
    }

    current = folder.parentId
  }

  return null
}

function narrows(visibility: StoredVisibility) {
  return visibility.mode !== "organization"
}

async function toOrganizationMember(
  ctx: QueryLikeCtx,
  organizationId: string,
  member: Member
): Promise<OrganizationMember | undefined> {
  const personId = await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "auth",
    externalId: member.userId,
  })

  if (personId === undefined) {
    return undefined
  }

  const display = await personDisplay(ctx, personId)

  return { personId, name: display.name, image: display.image }
}

/** Includes members who have not opened the console yet. Their plain-member
 *  sight matters when proving that a shared audience can see a resource. */
export async function listOrganizationViewerIds(
  ctx: QueryLikeCtx,
  organizationId: string
) {
  const members = await organizationMembers(ctx, organizationId)
  return await Promise.all(
    members.map((member) =>
      resolvePersonByIdentity(ctx, {
        organizationId,
        provider: "auth",
        externalId: member.userId,
      })
    )
  )
}

async function organizationMembers(ctx: QueryLikeCtx, organizationId: string) {
  return await authComponent
    .adapter(ctx)(createAdapterOptions())
    .findMany<Member>({
      model: "member",
      where: [{ field: "organizationId", value: organizationId }],
      limit: memberLimit,
    })
}
