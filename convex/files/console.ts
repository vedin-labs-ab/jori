import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  action,
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { resolveConsolePerson } from "../persons/account"
import { withOwnerDisplay, withOwnerDisplays } from "../persons/names"
import { visibilityValidator } from "../visibility/schema"
import { createSight } from "../visibility/sight"
import { blobUploadUrl, blobUrl, syncBlob } from "./blobs"
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
    epoch: v.number(),
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

    return await withOwnerDisplays(
      ctx,
      await Promise.all(visible.map(toConsoleRow))
    )
  },
})

export const get = query({
  args: {
    organizationId: v.string(),
    fileId: v.id("files"),
    epoch: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)
    const file = await ctx.db.get(args.fileId)

    if (file === null || !(await canViewFile(ctx, file, viewer))) {
      return { status: "not_found" as const, file: null }
    }

    return {
      status: "ready" as const,
      file: await withOwnerDisplay(ctx, await toConsoleRow(file)),
    }
  },
})

export const uploadUrl = mutation({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({ key: v.string(), url: v.string() }),
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await blobUploadUrl(ctx, args.organizationId)
  },
})

const createArgs = {
  organizationId: v.string(),
  key: v.string(),
  name: v.string(),
  visibility: v.optional(visibilityValidator),
  folderId: v.optional(v.id("folders")),
}

/** Recording an upload first reads its size and type from storage, which
 *  only an action can do; the caller's identity carries into the mutation. */
export const create = action({
  args: createArgs,
  handler: async (ctx, args): Promise<Id<"files">> => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await ctx.runMutation(internal.files.console.insert, {
      ...args,
      size: await syncBlob(ctx, args.key),
    })
  },
})

export const insert = internalMutation({
  args: { ...createArgs, size: v.number() },
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

const replaceArgs = {
  organizationId: v.string(),
  fileId: v.id("files"),
  key: v.string(),
}

export const replace = action({
  args: replaceArgs,
  handler: async (ctx, args): Promise<null> => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return await ctx.runMutation(internal.files.console.swap, {
      ...args,
      size: await syncBlob(ctx, args.key),
    })
  },
})

export const swap = internalMutation({
  args: { ...replaceArgs, size: v.number() },
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
export async function toConsoleRow(file: Doc<"files">) {
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
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    url: await blobUrl(file.blobKey),
  }
}
