import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { mutation, type QueryCtx, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { createSight } from "../visibility/sight"
import { folderChildren, subtreeImpact } from "./contents"
import { filedResourceType, fileResource } from "./filing"
import { createFolder, moveFolder, removeFolder, renameFolder } from "./records"
import { folderResources } from "./resources"
import {
  ancestorPath,
  getOrganizationFolder,
  listOrganizationFolders,
  requireVisibleFolder,
  summarizeFolder,
} from "./tree"

/** Every folder of the organization as one flat list; the client builds the
 *  tree. Capped generously at treeCap (see tree.ts). */
export const tree = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        folders: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const sight = createSight(ctx, {
      organizationId: args.organizationId,
      personId,
    })
    const folders = await listOrganizationFolders(ctx, args.organizationId)
    const visible: Doc<"folders">[] = []

    for (const folder of folders) {
      if (await sight.canSeeFolder(folder)) {
        visible.push(folder)
      }
    }

    return {
      status: "ready" as const,
      folders: visible.map(summarizeFolder),
    }
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        folder: null,
      }
    }

    const visible = await visibleFolder(ctx, args)

    if (visible === null) {
      return { status: "not_found" as const, folder: null }
    }

    return {
      status: "ready" as const,
      folder: {
        ...summarizeFolder(visible.folder),
        path: await ancestorPath(ctx, visible.folder),
      },
    }
  },
})

/** A folder's children: subfolders name-sorted, plus the filed resources the
 *  caller may see through each domain's own predicate. Capped per resource
 *  type at contentsCap (see contents.ts). */
export const contents = query({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        folders: [],
        resources: [],
      }
    }

    const visible = await visibleFolder(ctx, args)

    if (visible === null) {
      return { status: "not_found" as const, folders: [], resources: [] }
    }

    const viewer = {
      organizationId: args.organizationId,
      personId: visible.personId,
    }

    return {
      status: "ready" as const,
      folders: await folderChildren(ctx, {
        ...viewer,
        parentId: visible.folder._id,
      }),
      resources: await folderResources(ctx, {
        ...viewer,
        folderId: visible.folder._id,
      }),
    }
  },
})

/** The /folders overview's rows: the root folders with the same per-viewer
 *  item counts a folder page gives its children. The sidebar keeps reading
 *  the whole tree instead — counting across every folder of the
 *  organization would not stay cheap. */
export const roots = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        folders: [],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    return {
      status: "ready" as const,
      folders: await folderChildren(ctx, {
        organizationId: args.organizationId,
        personId,
        parentId: undefined,
      }),
    }
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    name: v.optional(v.string()),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return summarizeFolder(await createFolder(ctx, { ...args, personId }))
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await requireVisibleFolder(ctx, { ...args, personId })

    return summarizeFolder(await renameFolder(ctx, args))
  },
})

export const move = mutation({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
    parentId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await requireVisibleFolder(ctx, { ...args, personId })

    if (args.parentId !== null) {
      await requireVisibleFolder(ctx, {
        organizationId: args.organizationId,
        personId,
        folderId: args.parentId,
      })
    }

    return summarizeFolder(
      await moveFolder(ctx, {
        organizationId: args.organizationId,
        folderId: args.folderId,
        parentId: args.parentId ?? undefined,
      })
    )
  },
})

/** What a delete would take with it, for the dialog that asks: the whole
 *  subtree's folders and filed resources, plus where the survivors land when
 *  the caller keeps them. */
export const subtree = query({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return { status: "unauthorized" as const, message: access.message }
    }

    const visible = await visibleFolder(ctx, args)

    if (visible === null) {
      return { status: "not_found" as const }
    }

    return {
      status: "ready" as const,
      ...(await subtreeImpact(ctx, visible.folder)),
    }
  },
})

/** Deleting a folder deletes everything below it; the caller decides
 *  whether the resources filed inside go too or move up to the parent. */
export const remove = mutation({
  args: {
    organizationId: v.string(),
    folderId: v.id("folders"),
    deleteResources: v.boolean(),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await requireVisibleFolder(ctx, { ...args, personId })
    await removeFolder(ctx, args)

    return null
  },
})

/** The folder a console read may work with, and the person it reads as.
 *  Missing, foreign, and invisible folders all read as null, so a caller
 *  cannot probe what exists behind a visibility gate. */
async function visibleFolder(
  ctx: QueryCtx,
  args: { organizationId: string; folderId: Id<"folders"> }
) {
  const { organizationId, folderId } = args
  const personId = await resolveCurrentPerson(ctx, organizationId)
  const folder = await getOrganizationFolder(ctx, organizationId, folderId)
  const sight = createSight(ctx, { organizationId, personId })

  return folder === null || !(await sight.canSeeFolder(folder))
    ? null
    : { folder, personId }
}

/** The one generic filing mutation: a null folderId unfiles. */
export const file = mutation({
  args: {
    organizationId: v.string(),
    resourceType: filedResourceType,
    resourceId: v.string(),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, args) => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await fileResource(ctx, { ...args, personId })

    return null
  },
})
