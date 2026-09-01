import { v } from "convex/values"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { filedResourceType, loadFiledGate } from "../folders/filing"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { resolvePersonByIdentity } from "../persons/identity/links"
import {
  compareAudiences,
  listOrganizationMembers,
  narrowingFolderName,
  resolveAudience,
} from "./audience"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
  visibilityValidator,
} from "./schema"
import { createSight } from "./sight"
import { loadTarget, targetValidator } from "./target"
import { listOrganizationTeamIds } from "./viewer"

// The one console surface for changing who may see a material or folder,
// and for showing who that turns out to be. Automations change visibility
// through their editor instead, which also re-derives their execution
// principal.

/** The organization's members as grantable people, for the visibility
 *  picker, plus the caller's own person id so owner-only controls can
 *  disable themselves. */
export const grantees = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewerId = await resolvePersonByIdentity(ctx, {
      organizationId: args.organizationId,
      provider: "auth",
      externalId: requireUserId(identity),
    })

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
      visibility: args.visibility ?? target.gate.visibility,
    }
    const members = await listOrganizationMembers(ctx, args.organizationId)

    return {
      people: await resolveAudience(ctx, gate, members),
      memberCount: members.length,
      narrowedBy: await narrowingFolderName(
        ctx,
        args.organizationId,
        gate.folderId
      ),
    }
  },
})

/** What filing this resource into that folder would do to who can see it.
 *  The console confirms a move that changes the answer and stays quiet
 *  when it does not; null when the caller cannot see the resource, which
 *  reads the same way. */
export const moveAudience = query({
  args: {
    organizationId: v.string(),
    resourceType: filedResourceType,
    resourceId: v.string(),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const gate = await loadFiledGate(ctx, args.resourceType, args.resourceId)
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

    const members = await listOrganizationMembers(ctx, args.organizationId)

    return compareAudiences({
      before: await resolveAudience(ctx, gate, members),
      after: await resolveAudience(
        ctx,
        { ...gate, folderId: args.folderId ?? undefined },
        members
      ),
      memberCount: members.length,
    })
  },
})

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

    await ctx.db.patch(target.id, { visibility })

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
