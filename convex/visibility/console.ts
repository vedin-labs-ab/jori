import { type Member } from "better-auth/plugins/organization"
import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { authComponent, createAdapterOptions } from "../auth"
import { ensureCurrentPerson } from "../persons/account"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { personDisplay } from "../persons/names"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
  visibilityValidator,
} from "./schema"
import { createSight } from "./sight"
import { listOrganizationTeamIds } from "./viewer"

// The one console surface for changing who may see a material or folder.
// Automations change visibility through their editor instead, which also
// re-derives their execution principal.

const memberLimit = 200

const targetValidator = v.union(
  v.object({ kind: v.literal("table"), id: v.id("collections") }),
  v.object({ kind: v.literal("store"), id: v.id("collections") }),
  v.object({ kind: v.literal("file"), id: v.id("files") }),
  v.object({ kind: v.literal("folder"), id: v.id("folders") })
)

/** The organization's members as grantable people, for the visibility
 *  picker, plus the caller's own person id so owner-only controls can
 *  disable themselves. Members whose person row has not materialized yet
 *  (they have never opened the console) cannot be granted and are omitted. */
export const grantees = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewerId = await resolvePersonByIdentity(ctx, {
      organizationId: args.organizationId,
      provider: "auth",
      externalId: requireUserId(identity),
    })
    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    const members = await adapter.findMany<Member>({
      model: "member",
      where: [{ field: "organizationId", value: args.organizationId }],
      limit: memberLimit,
    })
    const people = await Promise.all(
      members.map(async (member) => {
        const personId = await resolvePersonByIdentity(ctx, {
          organizationId: args.organizationId,
          provider: "auth",
          externalId: member.userId,
        })

        if (personId === undefined) {
          return undefined
        }

        const display = await personDisplay(ctx, personId)

        return { personId, name: display.name, image: display.image }
      })
    )

    return {
      viewerId: viewerId ?? null,
      people: people
        .filter((person) => person !== undefined)
        .sort((left, right) =>
          (left.name ?? "").localeCompare(right.name ?? "")
        ),
    }
  },
})

/** Change who may see one material or folder. Owned targets accept the
 *  change from their owner only; ownerless ones from any member who can
 *  see them. Public visibility is confirmed in the console UI before this
 *  mutation runs; the grant lists are validated against the organization's
 *  live people and teams. */
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
    const seen =
      target.kind === "folder"
        ? await sight.canSeeFolder(target.folder)
        : await sight.canSee(target.gate)

    if (!seen) {
      throw new Error("Not found.")
    }

    if (target.owner !== undefined && target.owner !== personId) {
      throw new Error("Only the owner can change who may see this.")
    }

    await ctx.db.patch(target.id, { visibility })

    return null
  },
})

type Target =
  | {
      kind: "folder"
      id: Id<"folders">
      folder: Doc<"folders">
      owner: Id<"persons">
    }
  | {
      kind: "material"
      id: Id<"collections"> | Id<"files">
      gate: Doc<"collections"> | Doc<"files">
      owner: Id<"persons"> | undefined
    }

async function loadTarget(
  ctx: MutationCtx,
  organizationId: string,
  target: { kind: string; id: string }
): Promise<Target> {
  if (target.kind === "folder") {
    const folder = await ctx.db.get(target.id as Id<"folders">)

    if (folder === null || folder.organizationId !== organizationId) {
      throw new Error("Not found.")
    }

    return { kind: "folder", id: folder._id, folder, owner: folder.createdBy }
  }

  return await loadMaterialTarget(ctx, organizationId, target)
}

async function loadMaterialTarget(
  ctx: MutationCtx,
  organizationId: string,
  target: { kind: string; id: string }
): Promise<Target> {
  const table = target.kind === "file" ? "files" : "collections"
  const material = await ctx.db.get(target.id as Id<"collections" | "files">)

  if (
    material === null ||
    material.organizationId !== organizationId ||
    "kind" in material !== (table === "collections") ||
    ("kind" in material && material.kind !== target.kind)
  ) {
    throw new Error("Not found.")
  }

  return {
    kind: "material",
    id: material._id,
    gate: material,
    owner: material.ownerId,
  }
}

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
