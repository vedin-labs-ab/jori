import { type Id } from "../../_generated/dataModel"
import {
  type ExecutionPrincipal,
  executionPrincipalPersonId,
} from "../../runs/principal"
import { type QueryLikeCtx } from "../../shared/context"

export async function requireAutomationApp(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    appId: Id<"apps"> | undefined
    principal: ExecutionPrincipal
  }
) {
  if (args.appId === undefined) {
    return
  }

  const app = await ctx.db.get(args.appId)

  if (
    app === null ||
    app.organizationId !== args.organizationId ||
    (app.access === "personal" &&
      app.ownerId !== executionPrincipalPersonId(args.principal)) ||
    (args.principal.kind === "organization" && app.access !== "organization")
  ) {
    throw new Error("App not found.")
  }
}
