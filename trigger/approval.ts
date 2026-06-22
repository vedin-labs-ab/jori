import { wait } from "@trigger.dev/sdk/v3"
import { approvalWaitTimeout } from "../contracts/approvals"
import { type ToolSurface } from "../contracts/integrations"
import { runtimeEvent } from "./events"
import { type ModelToolCall } from "./model/types"
import { type ToolRuntime } from "./tool"
import {
  type ApprovalResolution,
  type JsonObject,
  type RuntimeTool,
} from "./types"

export type PromptedToolApprovalResult =
  | {
      approved: true
      input: JsonObject
    }
  | {
      approved: false
      result: JsonObject
    }

export async function awaitPromptedToolApproval(args: {
  call: ModelToolCall
  runtime: ToolRuntime
  surface: ToolSurface
  tool: Pick<RuntimeTool, "name" | "route">
  toolName: string
}): Promise<PromptedToolApprovalResult> {
  const token = await wait.createToken({
    idempotencyKey: `${args.runtime.context.run.id}:${args.call.id}`,
    tags: [args.runtime.context.run.id, `tool:${args.toolName}`],
    timeout: approvalWaitTimeout,
  })

  const approval = await args.runtime.convex.requestApproval({
    input: args.call.args,
    runId: args.runtime.context.run.id,
    surface: args.surface,
    tool: args.toolName,
    waitpointTokenId: token.id,
  })
  await recordWaitingEvent(args.runtime, args.call, args.tool)

  const result = await wait.forToken<ApprovalResolution>(token)
  const approvalId = readApprovalId(approval)

  if (!result.ok) {
    return deniedApproval("expired", approvalId)
  }

  if (result.output.decision !== "approved") {
    return deniedApproval(
      result.output.reason === "expired" ? "expired" : "denied",
      result.output.approvalId ?? approvalId
    )
  }

  return { approved: true, input: stripApproval(args.call.args) }
}

async function recordWaitingEvent(
  runtime: ToolRuntime,
  call: ModelToolCall,
  tool: Pick<RuntimeTool, "name" | "route">
) {
  await runtime.convex.recordEvent(
    runtimeEvent({
      data: {
        name: tool.name,
        route: tool.route,
      },
      runId: runtime.context.run.id,
      sequence: 0,
      source: "trigger.approval",
      callId: call.id,
      type: "tool.waiting",
    })
  )
}

function deniedApproval(
  status: "denied" | "expired",
  approvalId: string | null
) {
  return {
    approved: false as const,
    result: {
      approvalId,
      status,
    },
  }
}

function stripApproval(input: JsonObject) {
  const { approval: _approval, ...rest } = input

  return rest
}

function readApprovalId(value: unknown) {
  if (typeof value !== "object" || value === null || !("approvalId" in value)) {
    return null
  }

  const approvalId = value.approvalId

  return typeof approvalId === "string" ? approvalId : null
}
