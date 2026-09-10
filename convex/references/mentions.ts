import { v } from "convex/values"
import {
  type MentionResource,
  mentionsPerKind,
} from "../../contracts/replies/answers"
import { type ReferenceKind } from "../../contracts/replies/parts"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import { checkOrganizationAccess } from "../access"
import { searchCollections } from "../collections/access"
import { createConversationSight } from "../conversations/access"
import { visibleConsoleConversations } from "../conversations/list"
import { requireVisibleConsoleConversation } from "../conversations/resolve"
import { visibleFiles } from "../files/data"
import { listOrganizationFolders } from "../folders/tree"
import { canSeeJob } from "../jobs/access"
import { searchJobs } from "../jobs/lifecycle"
import { resolveCurrentPerson } from "../persons/account"
import { canSeeRun } from "../runs/visibility"
import { storeSpec } from "../stores/spec"
import { tableSpec } from "../tables/spec"
import { createSight, type Sight } from "../visibility/sight"

// What a message can mention, for the composer's picker: the resources of
// every kind the person can see, by name. Each kind reads through the
// predicate its own page uses, so the picker never offers what a
// reference would then refuse to open.

/** How many rows a kind is read from before the search and the sight
 *  narrow them: a search scans back through the organization's rows, a
 *  browse of everything reads the newest few and no further. */
const scanLimit = 200
const browseLimit = mentionsPerKind * 2

type Viewer = { personId: Id<"persons">; sight: Sight }

export const list = query({
  args: {
    organizationId: v.string(),
    query: v.string(),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return {
        status: "unauthorized" as const,
        message: access.message,
        resources: [] as MentionResource[],
      }
    }

    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const conversation =
      args.conversationId === undefined
        ? null
        : await requireVisibleConsoleConversation(ctx, {
            organizationId: args.organizationId,
            conversationId: args.conversationId,
            personId,
          })
    const viewer = {
      personId,
      sight:
        conversation === null
          ? createSight(ctx, { organizationId: args.organizationId, personId })
          : createConversationSight(ctx, conversation),
    }
    const search = args.query.trim().toLowerCase()
    const groups = await Promise.all([
      listChats(ctx, viewer, search),
      listCollections(ctx, viewer, "table", search),
      listCollections(ctx, viewer, "store", search),
      listFiles(ctx, viewer, search),
      listJobs(ctx, viewer, search),
      listFolders(ctx, viewer, search),
      listRuns(ctx, viewer, search),
    ])

    return { status: "ready" as const, resources: groups.flat() }
  },
})

async function listChats(ctx: QueryCtx, viewer: Viewer, search: string) {
  const conversations = []
  for await (const conversation of visibleConsoleConversations(
    ctx,
    viewer.sight
  )) {
    conversations.push(conversation)
    if (conversations.length >= readLimit(search)) {
      break
    }
  }

  return named(
    "chat",
    conversations,
    (conversation) => conversation.title ?? "",
    search
  )
}

async function listCollections(
  ctx: QueryCtx,
  viewer: Viewer,
  kind: "table" | "store",
  search: string
) {
  const args = {
    organizationId: viewer.sight.organizationId,
    limit: mentionsPerKind,
    personId: viewer.personId,
    query: search,
  }
  const collections: Array<{ _id: string; name: string }> =
    kind === "table"
      ? await searchCollections(ctx, tableSpec, args, viewer.sight)
      : await searchCollections(ctx, storeSpec, args, viewer.sight)

  return named(kind, collections, (collection) => collection.name, search)
}

async function listFiles(ctx: QueryCtx, viewer: Viewer, search: string) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_organization_and_created_at", (index) =>
      index.eq("organizationId", viewer.sight.organizationId)
    )
    .order("desc")
    .take(readLimit(search))

  return named(
    "file",
    await visibleFiles(viewer.sight, files),
    (file) => file.name,
    search
  )
}

async function listJobs(ctx: QueryCtx, viewer: Viewer, search: string) {
  const jobs = await searchJobs(ctx, {
    organizationId: viewer.sight.organizationId,
    includeCompleted: true,
    limit: readLimit(search),
    query: search,
  })
  const visible: Doc<"jobs">[] = []

  for (const job of jobs) {
    if (await canSeeJob(viewer.sight, job)) {
      visible.push(job)
    }
  }

  return named("job", visible, (job) => job.name, search)
}

async function listFolders(ctx: QueryCtx, viewer: Viewer, search: string) {
  const folders = await listOrganizationFolders(
    ctx,
    viewer.sight.organizationId
  )
  const visible: Doc<"folders">[] = []

  for (const folder of folders) {
    if (await viewer.sight.canSeeFolder(folder)) {
      visible.push(folder)
    }
  }

  return named("folder", visible, (folder) => folder.name, search)
}

/** Runs are the heaviest rows: a browse reads the newest page of them
 *  and no more, whatever the sight then keeps. */
async function listRuns(ctx: QueryCtx, viewer: Viewer, search: string) {
  const runs = await ctx.db
    .query("runs")
    .withIndex("by_organization", (index) =>
      index.eq("organizationId", viewer.sight.organizationId)
    )
    .order("desc")
    .take(search === "" ? mentionsPerKind : scanLimit)

  return named(
    "run",
    await visibleRuns(ctx, runs, viewer.sight),
    (run) => run.snapshot.title,
    search
  )
}

function readLimit(search: string) {
  return search === "" ? browseLimit : scanLimit
}

/** The rows of a kind whose name holds the search, as the picker lists
 *  them: the kind, the id, and the name. */
function named<Row extends { _id: string }>(
  kind: ReferenceKind,
  rows: Row[],
  nameOf: (row: Row) => string,
  search: string
): MentionResource[] {
  return rows
    .map((row) => ({ kind, id: row._id, name: nameOf(row) }))
    .filter((resource) => resource.name.toLowerCase().includes(search))
    .slice(0, mentionsPerKind)
}

async function visibleRuns(ctx: QueryCtx, runs: Doc<"runs">[], sight: Sight) {
  const visible = []
  for (const run of runs) {
    if (await canSeeRun(ctx, run, sight.personId, sight)) {
      visible.push(run)
    }
  }
  return visible
}
