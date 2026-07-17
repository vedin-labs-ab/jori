import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"

/** What a run needs to know about its attached artifact: the state contract
 *  by entry name, so instructions can reference entries without restating
 *  schema details the server already enforces. */
export type RunArtifactContext = {
  artifactId: Doc<"artifacts">["_id"]
  title: string
  contract: Array<{
    name: string
    scope: "personal" | "shared"
    schemaName: string
    schemaVersion: number
    description: string | null
  }>
}

export async function readRunArtifactContext(
  ctx: QueryLikeCtx,
  run: Pick<Doc<"runs">, "artifactId" | "tenantId">
): Promise<RunArtifactContext | null> {
  if (run.artifactId === undefined) {
    return null
  }

  const artifact = await ctx.db.get(run.artifactId)

  if (artifact === null || artifact.tenantId !== run.tenantId) {
    return null
  }

  return {
    artifactId: artifact._id,
    title: artifact.title,
    contract: (artifact.contract?.state ?? []).map((entry) => ({
      name: entry.name,
      scope: entry.scope,
      schemaName: entry.schemaName,
      schemaVersion: entry.schemaVersion,
      description: entry.description ?? null,
    })),
  }
}
