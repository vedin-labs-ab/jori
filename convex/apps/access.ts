import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber, optionalString } from "../shared/input"

const appSummaryLimit = 100

export async function searchApps(
  ctx: QueryCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    query?: string
    includeArchived?: boolean
    limit?: number
  }
) {
  const query = normalizeSearch(args.query)
  const limit = boundedNumber(args.limit, 25, 1, appSummaryLimit)
  const apps = await ctx.db
    .query("apps")
    .withIndex("by_organization_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId)
    )
    .order("desc")
    .take(appSummaryLimit)

  return apps
    .filter(
      (app) =>
        canAccessApp(app, args.personId) &&
        (args.includeArchived === true || app.archivedAt === undefined) &&
        matchesAppQuery(app, query)
    )
    .slice(0, limit)
}

export function canAccessApp(
  app: Pick<Doc<"apps">, "access" | "ownerId">,
  personId: Id<"persons">
) {
  return app.access === "organization" || app.ownerId === personId
}

/** Load an app only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleApp(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    personId: Id<"persons">
  }
) {
  const app = await ctx.db.get(args.appId)

  if (
    app === null ||
    app.organizationId !== args.organizationId ||
    !canAccessApp(app, args.personId)
  ) {
    return null
  }

  return app
}

export async function getAccessibleApp(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    personId: Id<"persons">
  }
) {
  const app = await findAccessibleApp(ctx, args)

  if (app === null) {
    throw new Error("App not found.")
  }

  return app
}

export function summarizeApp(app: Doc<"apps">) {
  return {
    appId: app._id,
    title: app.title,
    access: app.access,
    contract: app.contract,
    ownerId: app.ownerId,
    versionId: app.versionId,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    archivedAt: app.archivedAt,
  }
}

function normalizeSearch(query: string | undefined) {
  return optionalString(query)?.toLowerCase()
}

function matchesAppQuery(app: Doc<"apps">, query: string | undefined) {
  return query === undefined || app.title.toLowerCase().includes(query)
}
