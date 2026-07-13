import { type JsonObject } from "../../../contracts/json"
import {
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  type ToolSurface,
} from "../../../contracts/permissions"
import { encodeToolInput } from "../../../contracts/transport"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import {
  type AgentRuntimeInput,
  findRunIntegration,
} from "../../runs/agent/input"
import { type Actor, createPersonActor } from "../../shared/actor"
import { parsePromptedToolApproval } from "./args"
import { deliverApprovalRequest } from "./delivery"

export type ApprovalBrokerContext = {
  connectedIntegrations: Doc<"integrations">[]
  input: AgentRuntimeInput
  run: Doc<"runs">
  toolModes: ReadonlyMap<string, PermissionMode>
}

const workerOnlyMiloTools = ["save_asset", "generate_image"]

export async function createPromptedToolApproval(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    surface: ToolSurface
    tool: string
    args: JsonObject
    replyTarget?: string
  }
): Promise<{
  approvalId: Id<"approvals">
  code: string
  instruction: string
  status: "approval_requested"
}> {
  if (context.input.type === "automation") {
    throw new Error("Automations cannot request approval during a run")
  }

  const request = parsePromptedToolApproval(args)
  const permission = getToolPermission(request.tool)

  if (permission === undefined || permission.surface !== request.surface) {
    throw new Error(`Unknown ${request.surface} tool: ${request.tool}`)
  }

  const mode = resolveToolMode(context.toolModes, request.tool)

  if (mode !== "prompted") {
    throw new Error(`Tool does not require approval: ${request.tool}`)
  }

  if (
    request.surface === "milo" &&
    workerOnlyMiloTools.includes(request.tool)
  ) {
    throw new Error(`Tool cannot be approval-gated: ${request.tool}`)
  }

  if (
    request.surface !== "milo" &&
    findRunIntegration(context.input, request.surface) === null
  ) {
    throw new Error(`No active ${request.surface} integration is available`)
  }

  const approval = await ctx.runMutation(internal.approvals.approvals.create, {
    tenantId: context.run.tenantId,
    runId: context.run._id,
    surface: request.surface,
    tool: request.tool,
    ...encodeToolInput(request.args),
    summary: request.summary,
    code: createApprovalCode(),
    requestedBy: createRequestedBy(context),
  })
  if (!approval.reused) {
    await deliverApprovalRequest(ctx, context, {
      approvalId: approval.approvalId,
      code: approval.code,
      replyTarget: args.replyTarget,
      surface: request.surface,
      tool: request.tool,
      summary: request.summary,
      expiresAt: approval.expiresAt,
    })
  }

  return {
    status: "approval_requested",
    approvalId: approval.approvalId,
    code: approval.code,
    instruction: approvalInstruction(approval.reused),
  }
}

function createRequestedBy(context: ApprovalBrokerContext): Actor {
  if (context.input.run.createdBy !== undefined) {
    return createPersonActor(context.input.run.createdBy)
  }

  if (context.input.type === "message") {
    if (context.input.message.actor !== undefined) {
      return context.input.message.actor
    }
  }

  throw new Error("Approval request requires a known requester")
}

function createApprovalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(8)

  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}

function approvalInstruction(reused: boolean) {
  return reused
    ? "Approval request is already pending."
    : "Approval requested. Approval instructions were sent to the conversation."
}
