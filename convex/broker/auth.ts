import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { resolveToolModes } from "../permissions/catalog"
import { timingSafeEqual } from "../shared/crypto"
import { type ApprovalBrokerContext } from "./approval"

type BrokerContext = ApprovalBrokerContext

export async function authenticateBrokerRequest(
  ctx: ActionCtx,
  request: Request
): Promise<BrokerContext | null> {
  const runId = request.headers.get("x-milo-run-id")
  const secret = request.headers.get("x-milo-worker-secret")?.trim()

  if (
    runId === null ||
    runId.trim() === "" ||
    secret === undefined ||
    !isWorkerSecret(secret)
  ) {
    return null
  }

  const run = await ctx
    .runQuery(internal.runs.records.get, {
      runId: runId as Doc<"runs">["_id"],
    })
    .catch(() => null)

  return run?.status === "running" ? await loadRunBrokerContext(ctx, run) : null
}

export async function loadRunBrokerContext(
  ctx: ActionCtx,
  run: Doc<"runs">
): Promise<BrokerContext | null> {
  const input = await ctx.runQuery(internal.runs.records.getInputByRun, {
    runId: run._id,
  })

  if (input === null) {
    return null
  }

  const permissions = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: run.tenantId,
    }
  )
  const connectedIntegrations = await ctx.runQuery(
    internal.integrations.lookup.listActiveForRuntime,
    {
      tenantId: run.tenantId,
      ownerId: run.createdBy,
    }
  )
  const integrations: Doc<"integrations">[] = []

  for (const integration of input.integrations) {
    integrations.push(await prepareIntegrationForRuntime(ctx, { integration }))
  }

  return {
    connectedIntegrations,
    input,
    integrations,
    run,
    toolModes: resolveToolModes(permissions),
  }
}

function isWorkerSecret(secret: string) {
  const expected = process.env.MILO_WORKER_SECRET?.trim()

  return (
    expected !== undefined &&
    expected !== "" &&
    timingSafeEqual(secret, expected)
  )
}
