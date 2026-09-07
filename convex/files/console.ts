import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { resolveConsolePerson } from "../persons/account"
import { personDisplay } from "../persons/names"
import { visibilityValidator } from "../visibility/schema"
import { createSight } from "../visibility/sight"
import { canViewFile, type FileViewer, visibleFiles } from "./data"
import {
  insertUploadedFile,
  patchFileDetails,
  removeFileWithBlob,
  swapFileBlob,
} from "./records"

const maxConsoleFiles = 500

export const list = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)
    const files = await ctx.db
      .query("files")
      .withIndex("by_organization_and_created_at", (index) =>
        index.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(maxConsoleFiles)
    const visible = await visibleFiles(createSight(ctx, viewer), files)

    return await Promise.all(
      visible.map(async (file) => await toConsoleRow(ctx, file))
    )
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)
    const file = await ctx.db.get(args.fileId)

    if (file === null || !(await canViewFile(ctx, file, viewer))) {
      return { status: "not_found" as const, file: null }
    }

    return { status: "ready" as const, file: await toConsoleRow(ctx, file) }
  },
})

export const uploadUrl = mutation({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    visibility: v.optional(visibilityValidator),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)

    return await insertUploadedFile(ctx, viewer, args)
  },
})

export const update = mutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)

    await patchFileDetails(ctx, viewer, args)

    return null
  },
})

export const replace = mutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)

    await swapFileBlob(ctx, viewer, args)

    return null
  },
})

export const remove = mutation({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)

    await removeFileWithBlob(ctx, viewer, args.fileId)

    return null
  },
})

async function resolveViewer(
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
  identity: Awaited<ReturnType<typeof requireOrganizationAccess>>
): Promise<FileViewer> {
  const personId = await resolveConsolePerson(ctx, organizationId, identity)

  return { organizationId, personId }
}

/** Console shape of one file. The owner fields show the uploading person;
 *  an agent-saved file has run provenance and no owner, and the console
 *  shows it as Jori's own. */
export async function toConsoleRow(ctx: QueryCtx, file: Doc<"files">) {
  const owner =
    file.ownerId === undefined
      ? undefined
      : await personDisplay(ctx, file.ownerId)

  return {
    fileId: file._id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    visibility: file.visibility,
    folderId: file.folderId,
    source: file.runId === undefined ? ("upload" as const) : ("run" as const),
    runId: file.runId,
    ownerId: file.ownerId,
    ownerName: owner?.name,
    ownerImage: owner?.image,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    url: await ctx.storage.getUrl(file.storageId),
  }
}
