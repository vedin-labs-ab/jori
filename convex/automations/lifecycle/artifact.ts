import { type Id } from "../../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../../runs/principal"
import { type QueryLikeCtx } from "../../shared/context"

export async function requireAutomationArtifact(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts"> | undefined
    principal: ExecutionPrincipal
  }
) {
  if (args.artifactId === undefined) {
    return
  }

  const artifact = await ctx.db.get(args.artifactId)

  if (
    artifact === null ||
    artifact.tenantId !== args.tenantId ||
    (artifact.access === "personal" &&
      artifact.ownerId !== executionPrincipalPersonId(args.principal)) ||
    (args.principal.kind === "organization" &&
      artifact.access !== "organization")
  ) {
    throw new Error("Artifact not found.")
  }
}
