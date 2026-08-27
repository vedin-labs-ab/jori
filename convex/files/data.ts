import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { boundedNumber, optionalString } from "../shared/input"
import { fileFields } from "./schema"

const maxFileSearchResults = 100
const maxFilesScanned = 500

/** Who is looking: organization-scoped files are visible to every member,
 *  personal files only to their owner. */
export type FileViewer = {
  organizationId: string
  personId?: Id<"persons">
}

const viewerArgs = {
  organizationId: v.string(),
  personId: v.optional(v.id("persons")),
}

export const record = internalMutation({
  args: fileFields,
  handler: async (ctx, args) => {
    const now = Date.now()

    return await ctx.db.insert("files", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const search = internalQuery({
  args: {
    ...viewerArgs,
    query: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    limit: v.optional(v.number()),
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
    const matches = scanned
      .filter(
        (file) =>
          canViewFile(file, args) &&
          matchesQuery(file, query) &&
          matchesMimeType(file, mimeType)
      )
      .slice(0, limit)

    return await Promise.all(
      matches.map(async (file) => await summarizeFile(ctx, file))
    )
  },
})

const viewerFileArgs = {
  ...viewerArgs,
  fileId: v.id("files"),
}

export const read = internalQuery({
  args: viewerFileArgs,
  handler: async (ctx, args) => {
    const file = await getVisibleFile(ctx, args)

    return file === null ? null : await summarizeFile(ctx, file)
  },
})

export const getVisible = internalQuery({
  args: viewerFileArgs,
  handler: async (ctx, args) => await getVisibleFile(ctx, args),
})

export function canViewFile(file: Doc<"files">, viewer: FileViewer) {
  if (file.organizationId !== viewer.organizationId) {
    return false
  }

  return (
    file.scope === "organization" ||
    (viewer.personId !== undefined && file.ownerId === viewer.personId)
  )
}

async function getVisibleFile(
  ctx: QueryCtx,
  args: FileViewer & { fileId: Id<"files"> }
) {
  const file = await ctx.db.get(args.fileId)

  return file !== null && canViewFile(file, args) ? file : null
}

function normalizeSearchText(value: string | undefined) {
  return optionalString(value)?.toLowerCase()
}

function matchesQuery(file: Doc<"files">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return [file.name, file.description, file.mimeType].some(
    (value) => value?.toLowerCase().includes(query) === true
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

/** Keeps stored names to a safe single path segment; shared by the broker
 *  upload endpoint and the console. */
export function normalizeFileName(value: string | null | undefined) {
  const name = value
    ?.trim()
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[\r\n]/g, " ")
    .slice(0, 160)

  return name === undefined || name === "" ? "file" : name
}

export async function summarizeFile(ctx: QueryCtx, file: Doc<"files">) {
  return {
    fileId: file._id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt,
    url: await ctx.storage.getUrl(file.storageId),
    ...(file.description === undefined
      ? {}
      : { description: file.description }),
  }
}
