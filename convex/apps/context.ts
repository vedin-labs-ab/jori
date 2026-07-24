import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"

/** What a run needs to know about its attached app: the state contract
 *  by entry name, so instructions can reference entries without restating
 *  schema details the server already enforces. */
export type RunAppContext = {
  appId: Doc<"apps">["_id"]
  title: string
  contract: Array<{
    name: string
    scope: "personal" | "shared"
    schemaName: string
    schemaVersion: number
    description: string | null
  }>
}

export async function readRunAppContext(
  ctx: QueryLikeCtx,
  run: Pick<Doc<"runs">, "appId" | "organizationId">
): Promise<RunAppContext | null> {
  if (run.appId === undefined) {
    return null
  }

  const app = await ctx.db.get(run.appId)

  if (app === null || app.organizationId !== run.organizationId) {
    return null
  }

  return {
    appId: app._id,
    title: app.title,
    contract: (app.contract?.state ?? []).map((entry) => ({
      name: entry.name,
      scope: entry.scope,
      schemaName: entry.schemaName,
      schemaVersion: entry.schemaVersion,
      // The agent-facing slot: usage carries working guidance, with the
      // user description as the fallback for single-description contracts.
      description: entry.usage ?? entry.description ?? null,
    })),
  }
}
