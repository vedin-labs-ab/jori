import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireUserId } from "../access/users"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { optionalString, requiredString } from "../shared/input"
import { canViewFile, type FileViewer, normalizeFileName } from "./data"
import { fileScopes } from "./schema"

export const page = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)
    const result = await ctx.db
      .query("files")
      .withIndex("by_organization_and_created_at", (index) =>
        index.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .paginate(args.paginationOpts)
    const visible = result.page.filter((file) => canViewFile(file, viewer))

    return {
      ...result,
      page: await Promise.all(
        visible.map(async (file) => await toConsoleRow(ctx, file))
      ),
    }
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

    if (file === null || !canViewFile(file, viewer)) {
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
    description: v.optional(v.string()),
    scope: v.optional(fileScopes),
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
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const viewer = await resolveViewer(ctx, args.organizationId, identity)

    await patchFileDetails(ctx, viewer, args)

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

type FileScope = Doc<"files">["scope"]

/** Records a console upload: metadata comes from storage, the uploader owns
 *  the row, and the scope defaults to organization. */
export async function insertUploadedFile(
  ctx: MutationCtx,
  viewer: FileViewer,
  args: {
    storageId: Id<"_storage">
    name: string
    description?: string
    scope?: FileScope
  }
) {
  const scope = args.scope ?? "organization"

  if (scope === "personal" && viewer.personId === undefined) {
    throw new Error("Personal files need a resolvable owner")
  }

  const metadata = await ctx.db.system.get(args.storageId)

  if (metadata === null) {
    throw new Error("Uploaded file was not found in storage")
  }

  const now = Date.now()

  return await ctx.db.insert("files", {
    organizationId: viewer.organizationId,
    scope,
    ownerId: viewer.personId,
    storageId: args.storageId,
    name: normalizeFileName(args.name),
    mimeType: metadata.contentType ?? "application/octet-stream",
    size: metadata.size,
    description: optionalString(args.description),
    createdAt: now,
    updatedAt: now,
  })
}

export async function patchFileDetails(
  ctx: MutationCtx,
  viewer: FileViewer,
  args: { fileId: Id<"files">; name?: string; description?: string }
) {
  const file = await requireViewableFile(ctx, viewer, args.fileId)

  await ctx.db.patch(file._id, {
    ...(args.name === undefined
      ? {}
      : { name: normalizeFileName(requiredString(args.name, "name")) }),
    ...(args.description === undefined
      ? {}
      : { description: optionalString(args.description) }),
    updatedAt: Date.now(),
  })
}

/** The blob has no owner besides the row, so the two go together. */
export async function removeFileWithBlob(
  ctx: MutationCtx,
  viewer: FileViewer,
  fileId: Id<"files">
) {
  const file = await requireViewableFile(ctx, viewer, fileId)

  await ctx.storage.delete(file.storageId)
  await ctx.db.delete(file._id)
}

async function resolveViewer(
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
  identity: Awaited<ReturnType<typeof requireOrganizationAccess>>
): Promise<FileViewer> {
  const personId = await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "auth",
    externalId: requireUserId(identity),
  })

  return { organizationId, personId }
}

async function requireViewableFile(
  ctx: MutationCtx,
  viewer: FileViewer,
  fileId: Id<"files">
) {
  const file = await ctx.db.get(fileId)

  if (file === null || !canViewFile(file, viewer)) {
    throw new Error("File was not found")
  }

  return file
}

async function toConsoleRow(ctx: QueryCtx, file: Doc<"files">) {
  return {
    fileId: file._id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    scope: file.scope,
    source: file.runId === undefined ? ("upload" as const) : ("run" as const),
    runId: file.runId,
    description: file.description,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    url: await ctx.storage.getUrl(file.storageId),
  }
}
