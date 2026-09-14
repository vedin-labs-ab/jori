import { type Infer, v } from "convex/values"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { transitionConversationVisibility } from "../conversations/execution/sharing"
import { filedResourceType, loadFiledGate } from "../folders/filing"
import {
  ensureCurrentPerson,
  resolveConsolePerson,
  resolveCurrentPerson,
} from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import {
  compareMove,
  listOrganizationMembers,
  resolveAudience,
} from "./audience"
import { inheritedRestrictions } from "./inherited"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
  visibilityValidator,
} from "./schema"
import { createSight, type Gate } from "./sight"
import { folderGate, loadTarget, targetValidator } from "./target"
import { listOrganizationTeamIds, withinOrganizationTeams } from "./viewer"

// The one console surface for changing who may see a material or folder,
// and for showing who that turns out to be. Jobs change visibility
// through their editor instead, which also re-derives their execution
// principal.

/** The organization's members as grantable people, for the visibility
 *  picker, plus the caller's own person id so owner-only controls can
 *  disable themselves. */
export const grantees = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewerId = await resolveConsolePerson(
      ctx,
      args.organizationId,
      identity
    )

    return {
      viewerId: viewerId ?? null,
      people: await listOrganizationMembers(ctx, args.organizationId),
    }
  },
})

/** Who one material or folder actually reaches right now, and whether a
 *  folder above it narrows that below its own setting. Pass a visibility
 *  to ask the same question of an unsaved draft, so the sharing dialog can
 *  answer before anything is written. */
export const audience = query({
  args: {
    organizationId: v.string(),
    target: targetValidator,
    visibility: v.optional(visibilityValidator),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const target = await loadTarget(ctx, args.organizationId, args.target)
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })

    // The stored visibility decides whether the caller may ask; the draft
    // only decides what the answer is.
    if (!(await sight.canSee(target.gate))) {
      return null
    }

    const gate = {
      ...target.gate,
      visibility:
        args.visibility === undefined
          ? target.gate.visibility
          : await candidateVisibility(
              ctx,
              args.organizationId,
              args.visibility
            ),
    }
    const members = await listOrganizationMembers(ctx, args.organizationId)

    const inherited = await inheritedRestrictions(ctx, sight, gate.folderId)

    return {
      inherited,
      people: await resolveAudience(ctx, gate, members),
      memberCount: members.length,
      narrowedBy: inherited.folders.at(-1)?.name ?? null,
    }
  },
})

/** The draft the caller is asking about, cleared of team ids this
 *  organization does not own: resolving one would answer whether some
 *  member is on a team somewhere else. Only a teams-mode draft costs the
 *  extra read; stored visibility was already checked on its way in. */
async function candidateVisibility(
  ctx: QueryLikeCtx,
  organizationId: string,
  visibility: StoredVisibility
): Promise<StoredVisibility> {
  if (visibility.mode !== "teams") {
    return visibility
  }

  return withinOrganizationTeams(
    visibility,
    await listOrganizationTeamIds(ctx, organizationId)
  )
}

/** What a move moves: a filed resource re-files, a folder re-parents and
 *  takes everything inside it along. */
const movedSubject = v.union(
  v.object({
    kind: v.literal("resource"),
    resourceType: filedResourceType,
    resourceId: v.string(),
  }),
  v.object({ kind: v.literal("folder"), folderId: v.id("folders") })
)

/** What landing in that folder would do to who can see the subject —
 *  filing a resource there, or re-parenting a folder under it, where the
 *  answer speaks for the folder's contents too. The console confirms a
 *  move that changes the answer and stays quiet when it does not; null
 *  when the caller cannot see the subject, which reads the same way. */
export const moveAudience = query({
  args: {
    organizationId: v.string(),
    subject: movedSubject,
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const gate = await loadMovedGate(ctx, args.subject)
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })

    if (
      gate === null ||
      gate.organizationId !== args.organizationId ||
      !(await sight.canSee(gate))
    ) {
      return null
    }

    return await compareMove(
      ctx,
      gate,
      args.folderId ?? undefined,
      await listOrganizationMembers(ctx, args.organizationId)
    )
  },
})

/** The gate of whatever is being moved; null when nothing answers to that
 *  id. A folder reads through the same gate its own sharing surface uses. */
async function loadMovedGate(
  ctx: QueryLikeCtx,
  subject: Infer<typeof movedSubject>
): Promise<Gate | null> {
  if (subject.kind === "resource") {
    return await loadFiledGate(ctx, subject.resourceType, subject.resourceId)
  }

  const folder = await ctx.db.get(subject.folderId)

  return folder === null ? null : folderGate(folder)
}

/** Change who may see one material or folder. Owned targets accept the
 *  change from their owner only; ownerless ones from any member who can
 *  see them. Grant lists are validated against the organization's live
 *  people and teams. */
export const set = mutation({
  args: {
    organizationId: v.string(),
    target: targetValidator,
    visibility: visibilityValidator,
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)
    const visibility = normalizeStoredVisibility(args.visibility)

    await validateGrants(ctx, args.organizationId, visibility)

    const target = await loadTarget(ctx, args.organizationId, args.target)
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })

    if (!(await sight.canSee(target.gate))) {
      throw new Error("Not found.")
    }

    if (target.owner !== undefined && target.owner !== personId) {
      throw new Error("Only the owner can change who may see this.")
    }

    if (args.target.kind === "chat") {
      const conversation = await ctx.db.get(args.target.id)
      if (conversation === null) {
        throw new Error("Not found.")
      }
      await transitionConversationVisibility(
        ctx,
        conversation,
        visibility,
        personId
      )
    } else {
      await ctx.db.patch(target.id, { visibility })
    }

    return null
  },
})

/** Granted people must be persons of this organization; granted teams must
 *  be the organization's own teams. */
async function validateGrants(
  ctx: MutationCtx,
  organizationId: string,
  visibility: StoredVisibility
) {
  if (visibility.mode === "people") {
    for (const personId of visibility.personIds) {
      const person = await ctx.db.get(personId)

      if (person === null || person.organizationId !== organizationId) {
        throw new Error("Granted person is not in this organization.")
      }
    }
  }

  if (visibility.mode === "teams") {
    const teamIds = await listOrganizationTeamIds(ctx, organizationId)

    for (const teamId of visibility.teamIds) {
      if (!teamIds.has(teamId)) {
        throw new Error("Granted team is not in this organization.")
      }
    }
  }
}
