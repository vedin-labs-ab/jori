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
import { type ApprovalExecution } from "../../approvals/execution"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { loadRunBrokerContext } from "../../broker/auth"
import { type GitHubCloneCredentials } from "../platform/types"
import { toolErrorResult } from "./results"

// The broker carries every provider's tool implementation, more than the act
// step's module graph can hold within the runtime's evaluation memory
// alongside the loop itself, so it loads on the first call that needs it.
async function broker() {
  return await import("../../broker/mcp")
}

type ApprovalClaim =
  | { state: "done"; result: string }
  | { state: "executing"; expiresAt: number }
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
 * Attempt an approved action at most once. A lost result cannot establish
 * whether a provider write happened, so an expired claim never retries it.
 */
export async function executeRunApproval(
  ctx: ActionCtx,
  args: { approvalId: Id<"approvals">; runId: Id<"runs"> }
): Promise<ApprovalExecution> {
  const claim = (await ctx.runMutation(internal.approvals.execution.claim, {
    approvalId: args.approvalId,
    runId: args.runId,
  })) as ApprovalClaim

  if (claim.state === "done" || claim.state === "executing") {
    return claim
  }

  if (claim.state !== "claim") {
    return {
      state: "done",
      result: encodeToolResult(toolErrorResult("Approval is not executable.")),
    }
  }

  const encoded = await attemptApproval(ctx, args.runId, claim)
  // Persistence failures must propagate, not become a second execution or
  // overwrite a result whose commit acknowledgement was lost.
  const result = await ctx.runMutation(internal.approvals.execution.record, {
    ...args,
    result: encoded,
  })

  return { state: "done", result }
}

async function attemptApproval(
  ctx: ActionCtx,
  runId: Id<"runs">,
  claim: Extract<ApprovalClaim, { state: "claim" }>
) {
  try {
    const { executeApprovedTool } = await broker()
    const result = await executeApprovedTool(
      ctx,
      await loadBrokerContext(ctx, runId),
      {
        args: decodeJsonObject(claim.inputJson),
        surface: claim.surface,
        tool: claim.tool,
      }
    )

    return encodeToolResult(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed."

    return encodeToolResult(
      toolErrorResult(
        `${message} Do not retry this approved action automatically; verify any external effects first.`
      )
    )
  }
}

/** Cloning is a GitHub tool call the sandbox performs itself, so it is
 *  authorized like one before the token leaves Convex. */
export async function fetchRunCloneCredentials(
  ctx: ActionCtx,
  args: { owner: string; repo: string; runId: Id<"runs"> }
): Promise<GitHubCloneCredentials> {
  const [context, { authorizeTool, requireSurfaceIntegration }, tools] =
    await Promise.all([
      loadBrokerContext(ctx, args.runId),
      broker(),
      import("../../broker/tools"),
    ])

  authorizeTool(context, cloneRequest)

  return tools.createGitHubCloneCredentials({
    integration: requireSurfaceIntegration(context, cloneRequest.surface),
    owner: args.owner,
    repo: args.repo,
  })
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
