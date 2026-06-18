import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { resolveToolModes } from "../permissions/catalog"
import { type ApprovalBrokerContext } from "./approval"

type BrokerContext = ApprovalBrokerContext

export async function authenticateBrokerRequest(
  ctx: ActionCtx,
  request: Request
): Promise<BrokerContext | null> {
  const executionId = request.headers.get("x-milo-execution-id")
  const secret = request.headers.get("x-milo-worker-secret")?.trim()

  if (
    executionId === null ||
    executionId.trim() === "" ||
    secret === undefined ||
    !isWorkerSecret(secret)
  ) {
    return null
  }

  const execution = await ctx
    .runQuery(internal.executions.records.get, {
      executionId: executionId as Doc<"executions">["_id"],
    })
    .catch(() => null)

  return execution?.status === "running"
    ? await loadBrokerContext(ctx, execution)
    : null
}

async function loadBrokerContext(
  ctx: ActionCtx,
  execution: Doc<"executions"> | null
): Promise<BrokerContext | null> {
  if (execution === null) {
    return null
  }

  const input = await ctx.runQuery(internal.executions.records.getInputByRun, {
    runId: execution.runId,
  })

  if (input === null) {
    return null
  }

  const permissions = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: execution.tenantId,
    }
  )
  const integrations: Doc<"integrations">[] = []

  for (const integration of input.integrations) {
    integrations.push(await prepareIntegrationForRuntime(ctx, { integration }))
  }

  return {
    execution,
    input,
    integrations,
    toolModes: resolveToolModes(permissions),
  }
}

function isWorkerSecret(secret: string) {
  const expected = process.env.MILO_WORKER_SECRET?.trim()

  return expected !== undefined && expected !== "" && secret === expected
}
