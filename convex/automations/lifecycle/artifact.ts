import { type Scope } from "../../../contracts/permissions/scope"
import { type Id } from "../../_generated/dataModel"
import { type QueryLikeCtx } from "../../shared/context"

export async function requireAutomationArtifact(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts"> | undefined
    createdBy: Id<"persons"> | undefined
    scope: Scope
  }
) {
  if (args.artifactId === undefined) {
    return
  }

  const artifact = await ctx.db.get(args.artifactId)

  if (
    artifact === null ||
    artifact.tenantId !== args.tenantId ||
    (artifact.access === "personal" && artifact.ownerId !== args.createdBy) ||
    (args.scope === "organization" && artifact.access !== "organization")
  ) {
    throw new Error("Artifact not found.")
  }
}
