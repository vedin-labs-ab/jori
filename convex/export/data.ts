import { type PaginationOptions } from "convex/server"
import { type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { conversationGate } from "../conversations/access"
import { blobUrl } from "../files/blobs"
import { jobGate } from "../jobs/access"
import { conversationMessages } from "../messages/read"
import { type Sight } from "../visibility/sight"

export type ExportSection =
  | "jobs"
  | "folders"
  | "files"
  | "collections"
  | "conversations"

export async function resourcePage(
  ctx: QueryCtx,
  organizationId: string,
  section: ExportSection,
  cursor: string | null,
  sight?: Sight
) {
  const options = pageOptions(cursor)
  switch (section) {
    case "jobs":
      return jobPage(ctx, organizationId, options, sight)
    case "folders": {
      const result = await ctx.db
        .query("folders")
        .withIndex("by_organization_and_parent", (q) =>
          q.eq("organizationId", organizationId)
        )
        .paginate(options)
      return filteredPage(
        result,
        async (row) => !sight || (await sight.canSeeFolder(row))
      )
    }
    case "files": {
      const result = await ctx.db
        .query("files")
        .withIndex("by_organization_and_created_at", (q) =>
          q.eq("organizationId", organizationId)
        )
        .paginate(options)
      const visible = await filteredPage(
        result,
        async (row) => !sight || (await sight.canSee(row))
      )
      return {
        ...visible,
        page: visible.page.map(({ blobKey: _blobKey, ...row }) => row),
      }
    }
    case "collections": {
      const result = await ctx.db
        .query("collections")
        .withIndex("by_organization_and_kind_and_updated_at", (q) =>
          q.eq("organizationId", organizationId)
        )
        .paginate(options)
      return filteredPage(
        result,
        async (row) => !sight || (await sight.canSee(row))
      )
    }
    case "conversations":
      return conversationPage(ctx, organizationId, options, sight)
  }
}

export async function childPage(
  ctx: QueryCtx,
  args: {
    organizationId: string
    parentId: Id<"collections"> | Id<"conversations">
    section: "documents" | "messages"
    cursor: string | null
  },
  sight?: Sight
) {
  if (args.section === "documents") {
    const id = ctx.db.normalizeId("collections", args.parentId)
    const parent = id === null ? null : await ctx.db.get(id)
    if (
      !parent ||
      parent.organizationId !== args.organizationId ||
      (sight && !(await sight.canSee(parent)))
    ) {
      throw new Error("Collection is unavailable for export.")
    }
    return ctx.db
      .query("documents")
      .withIndex("by_collection", (q) => q.eq("collectionId", parent._id))
      .paginate(pageOptions(args.cursor))
  }
  const id = ctx.db.normalizeId("conversations", args.parentId)
  const parent = id === null ? null : await ctx.db.get(id)
  if (
    !parent ||
    parent.organizationId !== args.organizationId ||
    (sight &&
      (parent.surface !== "console" ||
        !(await sight.canSee(conversationGate(parent)))))
  ) {
    throw new Error("Chat is unavailable for export.")
  }
  const result = await conversationMessages(ctx, parent).paginate(
    pageOptions(args.cursor)
  )
  return {
    ...result,
    page: result.page.map((row) => ({
      _id: row._id,
      conversationId: parent._id,
      type: row.type,
      text: row.text,
      personId: row.personId,
      createdAt: row.createdAt,
    })),
  }
}

export async function fileUrl(
  ctx: QueryCtx,
  organizationId: string,
  fileId: Id<"files">,
  sight?: Sight
) {
  const file = await ctx.db.get(fileId)
  if (
    !file ||
    file.organizationId !== organizationId ||
    (sight && !(await sight.canSee(file)))
  ) {
    throw new Error("File is unavailable for export.")
  }
  return { url: await blobUrl(file.blobKey), size: file.size }
}

function pageOptions(cursor: string | null): PaginationOptions {
  return { cursor, numItems: 20, maximumBytesRead: 2_000_000 }
}

async function filteredPage<T>(
  result: { page: T[]; continueCursor: string; isDone: boolean },
  visible: (row: T) => Promise<boolean>
) {
  const checks = await Promise.all(result.page.map(visible))
  return { ...result, page: result.page.filter((_, index) => checks[index]) }
}

async function conversationPage(
  ctx: QueryCtx,
  organizationId: string,
  options: PaginationOptions,
  sight?: Sight
) {
  const result = await ctx.db
    .query("conversations")
    .withIndex("by_organization_and_surface_and_updated_at", (q) =>
      q.eq("organizationId", organizationId)
    )
    .paginate(options)
  const visible = await filteredPage(
    result,
    async (row) =>
      !sight ||
      (row.surface === "console" && (await sight.canSee(conversationGate(row))))
  )
  return {
    ...visible,
    page: visible.page.map((row) => ({
      _id: row._id,
      title: row.title,
      surface: row.surface,
      createdAt: row._creationTime,
      updatedAt: row.updatedAt,
      folderId: row.folderId,
    })),
  }
}

async function jobPage(
  ctx: QueryCtx,
  organizationId: string,
  options: PaginationOptions,
  sight?: Sight
) {
  const result = await ctx.db
    .query("jobs")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .paginate(options)
  const visible = await filteredPage(
    result,
    async (row) => !sight || (await sight.canSee(jobGate(row)))
  )
  return {
    ...visible,
    page: visible.page.map((row) => ({
      _id: row._id,
      name: row.name,
      instructions: row.instructions,
      type: row.type,
      status: row.status,
      trigger: row.trigger,
      createdAt: row.createdAt,
      folderId: row.folderId,
    })),
  }
}
