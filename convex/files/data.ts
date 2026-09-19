import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { mark } from "../discovery/sync/intent"
import { assertWorkspaceAvailable } from "../retention/access"
import { boundedNumber, optionalString } from "../shared/input"
import {
  createResourceSight,
  type ResourceViewer,
  resourceCreation,
  resourceViewerArgs,
} from "../visibility/resources"
import { type Sight } from "../visibility/sight"
import { blobUrl, requireUnusedUpload } from "./blobs"
import { fileFields } from "./schema"

const maxFileSearchResults = 100
const maxFilesScanned = 500

export type FileViewer = ResourceViewer

export const record = internalMutation({
  args: fileFields,
  handler: async (ctx, args) => {
    await assertWorkspaceAvailable(ctx, args.organizationId)
    await requireUnusedUpload(ctx, {
      organizationId: args.organizationId,
      key: args.blobKey,
    })
    const now = Date.now()
    const fileId = await ctx.db.insert("files", {
      ...args,
      ...(args.runId === undefined
        ? {}
        : await resourceCreation(ctx, {
            organizationId: args.organizationId,
            runId: args.runId,
          })),
      createdAt: now,
      updatedAt: now,
    })

    await mark(ctx, args.organizationId, fileId)

    return fileId
  },
})

export const search = internalQuery({
  args: {
    ...resourceViewerArgs,
    query: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    limit: v.optional(v.number()),
    epoch: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = boundedNumber(args.limit, 25, 1, maxFileSearchResults)
    const query = normalizeSearchText(args.query)
    const mimeType = normalizeSearchText(args.mimeType)
    const scanned = await ctx.db
      .query("files")
      .withIndex("by_organization_and_created_at", (index) =>
        index.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(maxFilesScanned)
    const sight = await createResourceSight(ctx, args)
    const matches: Doc<"files">[] = []

    for (const file of scanned) {
      if (matches.length >= limit) {
        break
      }

      if (
        matchesQuery(file, query) &&
        matchesMimeType(file, mimeType) &&
        (await sight.canSee(file))
      ) {
        matches.push(file)
      }
    }

    return await Promise.all(matches.map(summarizeFile))
  },
})

const viewerFileArgs = {
  ...resourceViewerArgs,
  fileId: v.id("files"),
}

export const read = internalQuery({
  args: { ...viewerFileArgs, epoch: v.number() },
  handler: async (ctx, args) => {
    const file = await getVisibleFile(ctx, args)

    return file === null ? null : await summarizeFile(file)
  },
})

export const getVisible = internalQuery({
  args: viewerFileArgs,
  handler: async (ctx, args) => await getVisibleFile(ctx, args),
})

/** A run may import only its own generated files from this deployment. */
export const forRun = internalQuery({
  args: { fileId: v.id("files"), runId: v.id("runs") },
  returns: v.object({ blobKey: v.string(), size: v.number() }),
  handler: async (ctx, args) => {
    const [file, run] = await Promise.all([
      ctx.db.get(args.fileId),
      ctx.db.get(args.runId),
    ])
    if (
      file === null ||
      run === null ||
      file.runId !== run._id ||
      file.organizationId !== run.organizationId
    ) {
      throw new Error("File does not belong to this run.")
    }
    return { blobKey: file.blobKey, size: file.size }
  },
})

/** The one file predicate; a Sight built from the viewer answers it. */
export async function canViewFile(
  ctx: QueryCtx,
  file: Doc<"files">,
  viewer: FileViewer
) {
  return await (await createResourceSight(ctx, viewer)).canSee(file)
}

/** Filter form for list surfaces that already hold a Sight. */
export async function visibleFiles(sight: Sight, files: Doc<"files">[]) {
  const visible: Doc<"files">[] = []

  for (const file of files) {
    if (await sight.canSee(file)) {
      visible.push(file)
    }
  }

  return visible
}

async function getVisibleFile(
  ctx: QueryCtx,
  args: FileViewer & { fileId: Id<"files"> }
) {
  const file = await ctx.db.get(args.fileId)

  if (file === null) {
    return null
  }

  return (await canViewFile(ctx, file, args)) ? file : null
}

function normalizeSearchText(value: string | undefined) {
  return optionalString(value)?.toLowerCase()
}

function matchesQuery(file: Doc<"files">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return [file.name, file.mimeType].some((value) =>
    value.toLowerCase().includes(query)
  )
}

function matchesMimeType(file: Doc<"files">, mimeType: string | undefined) {
  if (mimeType === undefined) {
    return true
  }

  const fileMimeType = file.mimeType.toLowerCase()

  return mimeType.endsWith("/")
    ? fileMimeType.startsWith(mimeType)
    : fileMimeType === mimeType
}

async function summarizeFile(file: Doc<"files">) {
  return {
    fileId: file._id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt,
    url: await blobUrl(file.blobKey),
  }
}
