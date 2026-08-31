import { v } from "convex/values"
import {
  decodeToolInput,
  encodeToolResult,
} from "../../contracts/json/transport"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, action } from "../_generated/server"
import {
  type ApprovalBrokerContext,
  createPromptedToolApproval,
} from "../broker/approval"
import { loadRunBrokerContext } from "../broker/auth"
import { callBrokerTool, executeApprovedTool } from "../broker/mcp"
import { type ToolSurface, toolSurfaceValidator } from "../shared/integrations"
import { requireWorkerSecret } from "./secret"

type ApprovalClaim =
  | { state: "done"; result: string }
  | { state: "executing" }
  | { state: "invalid" }
  | { state: "claim"; surface: ToolSurface; tool: string; inputJson: string }

export const call = action({
  args: {
    inputJson: v.string(),
    replyTarget: v.optional(v.string()),
    runId: v.id("runs"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const result = await callBrokerTool(
      ctx,
      await loadBrokerContext(ctx, args.runId),
      {
        args: decodeToolInput(args.inputJson),
        replyTarget: args.replyTarget,
        surface: args.surface,
        tool: args.tool,
      }
    )

    return encodeToolResult(result)
  },
})

export const requestApproval = action({
  args: {
    inputJson: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    surface: toolSurfaceValidator,
    tool: v.string(),
  },
  returns: v.object({
    approvalId: v.id("approvals"),
    code: v.string(),
    instruction: v.string(),
    status: v.literal("approval_requested"),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    return await createPromptedToolApproval(
      ctx,
      await loadBrokerContext(ctx, args.runId),
      {
        args: decodeToolInput(args.inputJson),
        surface: args.surface,
        tool: args.tool,
      }
    )
  },
})

export const executeApproval = action({
  args: {
    secret: v.string(),
    runId: v.id("runs"),
    approvalId: v.id("approvals"),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    requireWorkerSecret(args.secret)

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

    const result = await executeApprovedTool(
      ctx,
      await loadBrokerContext(ctx, args.runId),
      {
        surface: claim.surface,
        tool: claim.tool,
        args: decodeToolInput(claim.inputJson),
      }
    )
    const encoded = encodeToolResult(result)

    await ctx.runMutation(internal.approvals.execution.record, {
      approvalId: args.approvalId,
      result: encoded,
    })

    return encoded
  },
})

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
  runId: Doc<"runs">["_id"]
): Promise<ApprovalBrokerContext> {
  const run = await ctx.runQuery(internal.runs.records.get, {
    runId,
  })

  if (run === null) {
    throw new Error("Run not found.")
  }

  const context = await loadRunBrokerContext(ctx, run)

  if (context === null) {
    throw new Error("Run input not found.")
  }

  return context
}
