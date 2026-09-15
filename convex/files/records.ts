import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { deleteTargetShares } from "../collections/shares"
import { mark } from "../discovery/sync/intent"
import { resolveCreationFolder } from "../folders/tree"
import { type QueryLikeCtx } from "../shared/context"
import { requiredString } from "../shared/input"
import {
  normalizeStoredVisibility,
  type StoredVisibility,
} from "../visibility/schema"
import { deleteUnusedBlob, requireUnusedUpload } from "./blobs"
import { canViewFile, type FileViewer } from "./data"
import { normalizeFileName } from "./names"

// File record writes shared by the console mutations: upload, details,
// blob replacement, and removal. Every write starts from a viewable file.

/** Records a console upload: metadata comes from storage, the uploader owns
 *  the row, and visibility defaults to the whole organization. */
export async function insertUploadedFile(
  ctx: MutationCtx,
  viewer: FileViewer,
  args: {
    storageId: Id<"_storage">
    name: string
    visibility?: StoredVisibility
    folderId?: Id<"folders">
  }
) {
  const visibility = normalizeStoredVisibility(
    args.visibility ?? { mode: "organization" }
  )

  if (visibility.mode === "private" && viewer.personId === undefined) {
    throw new Error("Private files need a resolvable owner")
  }

  const metadata = await requireUnusedUpload(ctx, args.storageId)

  const now = Date.now()
  const fileId = await ctx.db.insert("files", {
    organizationId: viewer.organizationId,
    visibility,
    ownerId: viewer.personId,
    folderId: await resolveCreationFolder(ctx, {
      organizationId: viewer.organizationId,
      personId: viewer.personId,
      folderId: args.folderId,
    }),
    storageId: args.storageId,
    name: normalizeFileName(args.name),
    mimeType: metadata.contentType ?? "application/octet-stream",
    size: metadata.size,
    createdAt: now,
    updatedAt: now,
  })

  await mark(ctx, viewer.organizationId, fileId)

  return fileId
}

export async function patchFileDetails(
  ctx: MutationCtx,
  viewer: FileViewer,
  args: { fileId: Id<"files">; name?: string }
) {
  const file = await requireViewableFile(ctx, viewer, args.fileId)

  await ctx.db.patch(file._id, {
    ...(args.name === undefined
      ? {}
      : { name: normalizeFileName(requiredString(args.name, "name")) }),
    updatedAt: Date.now(),
  })
  await mark(ctx, file.organizationId, file._id)
}

/** Swaps the file's content for a freshly uploaded blob: the row keeps its
 *  identity while storage id, size, and updatedAt follow the new upload.
 *  Last write wins; the replaced blob goes when no other row references it. */
export async function swapFileBlob(
  ctx: MutationCtx,
  viewer: FileViewer,
  args: { fileId: Id<"files">; storageId: Id<"_storage"> }
) {
  const file = await requireViewableFile(ctx, viewer, args.fileId)
  const metadata = await requireUnusedUpload(ctx, args.storageId)

  await ctx.db.patch(file._id, {
    storageId: args.storageId,
    size: metadata.size,
    updatedAt: Date.now(),
  })
  await mark(ctx, file.organizationId, file._id)
  await deleteUnusedBlob(ctx, file.storageId)
}

export async function removeFileWithBlob(
  ctx: MutationCtx,
  viewer: FileViewer,
  fileId: Id<"files">
) {
  await purgeFile(ctx, await requireViewableFile(ctx, viewer, fileId))
}

/** Remove the row and its share capabilities, then its unreferenced blob.
 * Reached through console, folder, and workspace deletion. */
export async function purgeFile(ctx: MutationCtx, file: Doc<"files">) {
  await ctx.db.delete(file._id)
  await mark(ctx, file.organizationId, file._id)
  await deleteTargetShares(ctx, { kind: "file", id: file._id })
  await deleteUnusedBlob(ctx, file.storageId)
}

export async function requireViewableFile(
  ctx: QueryLikeCtx,
  viewer: FileViewer,
  fileId: Id<"files">
) {
  const file = await ctx.db.get(fileId)

  if (file === null || !(await canViewFile(ctx, file, viewer))) {
    throw new Error("File was not found")
  }

  return file
}
