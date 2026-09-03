import { resolveToolModes } from "../../contracts/permissions"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { executionPrincipalPersonId } from "../runs/principal"
import { type ApprovalBrokerContext } from "./approval"

type BrokerContext = ApprovalBrokerContext

export async function loadRunBrokerContext(
  ctx: ActionCtx,
  run: Doc<"runs">
): Promise<BrokerContext | null> {
  const canExecuteTools = await ctx.runQuery(
    internal.jobs.records.canExecuteRunTools,
    { runId: run._id }
  )

  if (!canExecuteTools) {
    return null
  }

  const input = await ctx.runQuery(internal.runs.records.getInputByRun, {
    runId: run._id,
  })

  if (input === null) {
    return null
  }

  const permissions = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      organizationId: run.organizationId,
    }
  )
  const connectedIntegrations = await ctx.runQuery(
    internal.integrations.lookup.listActiveForRuntime,
    {
      organizationId: run.organizationId,
      ownerId: executionPrincipalPersonId(run.principal),
    }
  )
  return {
    connectedIntegrations,
    input,
    run,
    toolModes: resolveToolModes(permissions),
  }
}
