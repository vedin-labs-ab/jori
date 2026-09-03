import { type ToolSurface } from "../../../contracts/integrations"
import {
  decodeJson,
  decodeJsonObject,
  encodeToolResult,
  type JsonObject,
  type JsonValue,
} from "../../../contracts/json"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { loadRunBrokerContext } from "../../broker/auth"
import { type GitHubCloneCredentials } from "../platform"

// The broker carries every provider's tool implementation, more than the act
// step's module graph can hold within the runtime's evaluation memory
// alongside the loop itself, so it loads on the first call that needs it.
async function broker() {
  return await import("../../broker/mcp")
}

type ApprovalClaim =
  | { state: "done"; result: string }
  | { state: "executing" }
  | { state: "invalid" }
  | { state: "claim"; surface: ToolSurface; tool: string; inputJson: string }

const cloneRequest = {
  surface: "github" as const,
  tool: "github_clone_repository",
}

/** Every tool the model reaches outside its own sandbox goes through the
 *  broker, which re-checks the run's permissions before the call. */
export async function callRunTool(
  ctx: ActionCtx,
  args: {
    input: JsonObject
    runId: Id<"runs">
    surface: ToolSurface
    tool: string
  }
): Promise<JsonValue> {
  const { callBrokerTool } = await broker()
  const result = await callBrokerTool(
    ctx,
    await loadBrokerContext(ctx, args.runId),
    { args: args.input, surface: args.surface, tool: args.tool }
  )

  return decodeJson(encodeToolResult(result))
}

export async function requestRunApproval(
  ctx: ActionCtx,
  args: {
    input: JsonObject
    replyTarget?: string
    runId: Id<"runs">
    surface: ToolSurface
    tool: string
  }
) {
  const { createPromptedToolApproval } = await import("../../broker/approval")

  return await createPromptedToolApproval(
    ctx,
    await loadBrokerContext(ctx, args.runId),
    {
      args: args.input,
      ...(args.replyTarget === undefined
        ? {}
        : { replyTarget: args.replyTarget }),
      surface: args.surface,
      tool: args.tool,
    }
  )
}

/**
 * Run an approved action exactly once. The claim mutation is the lease: a
 * second caller sees the stored result or an in-flight execution instead of
 * calling the provider again.
 */
export async function executeRunApproval(
  ctx: ActionCtx,
  args: { approvalId: Id<"approvals">; runId: Id<"runs"> }
): Promise<string> {
  const claim = (await ctx.runMutation(internal.approvals.execution.claim, {
    approvalId: args.approvalId,
    runId: args.runId,
  })) as ApprovalClaim

  if (claim.state === "done") {
    return claim.result
  }

  if (claim.state !== "claim") {
    return encodeToolResult(claimNotReadyResult(claim.state))
  }

  const { executeApprovedTool } = await broker()
  const result = await executeApprovedTool(
    ctx,
    await loadBrokerContext(ctx, args.runId),
    {
      args: decodeJsonObject(claim.inputJson),
      surface: claim.surface,
      tool: claim.tool,
    }
  )
  const encoded = encodeToolResult(result)

  await ctx.runMutation(internal.approvals.execution.record, {
    approvalId: args.approvalId,
    result: encoded,
  })

  return encoded
}

/** Cloning is a GitHub tool call the sandbox performs itself, so it is
 *  authorized like one before the token leaves Convex. */
export async function fetchRunCloneCredentials(
  ctx: ActionCtx,
  args: { owner: string; repo: string; runId: Id<"runs"> }
): Promise<GitHubCloneCredentials> {
  const [context, { authorizeSurfaceTool, authorizeTool }, tools] =
    await Promise.all([
      loadBrokerContext(ctx, args.runId),
      broker(),
      import("../../broker/tools"),
    ])

  authorizeTool(context, cloneRequest)

  const integration = await authorizeSurfaceTool(context, cloneRequest)

  if (integration === null) {
    throw new Error("No active github integration is available")
  }

  return tools.createGitHubCloneCredentials({
    integration,
    owner: args.owner,
    repo: args.repo,
  })
}

function claimNotReadyResult(state: "executing" | "invalid") {
  if (state === "executing") {
    return { status: "pending", message: "Approved action is still running." }
  }

  return {
    status: "error",
    error: { message: "Approval is not executable." },
  }
}

async function loadBrokerContext(
  ctx: ActionCtx,
  runId: Id<"runs">
): Promise<ApprovalBrokerContext> {
  const run = await ctx.runQuery(internal.runs.records.get, { runId })

  if (run === null) {
    throw new Error("Run not found.")
  }

  const context = await loadRunBrokerContext(ctx, run)

  if (context === null) {
    throw new Error("Run input not found.")
  }

  return context
}
