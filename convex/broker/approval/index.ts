import { type JsonObject } from "../../../contracts/json"
import { encodeToolInput } from "../../../contracts/tool-transport"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { createSlackApprovalRequest } from "../../approvals/slack/blocks"
import {
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  type ToolSurface,
} from "../../permissions/catalog"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../../providers/slack/data"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { type Actor, createUserActor } from "../../shared/actor"
import { postSlackMessage } from "../tools/slack"
import { parsePromptedToolApproval } from "./args"

export type ApprovalBrokerContext = {
  connectedIntegrations: Doc<"integrations">[]
  input: AgentRuntimeInput
  integrations: Doc<"integrations">[]
  run: Doc<"runs">
  toolModes: ReadonlyMap<string, PermissionMode>
}

type SlackApprovalDelivery = {
  integration: Doc<"integrations">
  channelId: string
  threadTs?: string
}

type SlackApprovalRequest = {
  approvalId: Id<"approvals">
  code: string
  surface: ToolSurface
  tool: string
  summary: string
  expiresAt: number
  delivery: SlackApprovalDelivery
}

export async function createPromptedToolApproval(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    surface: ToolSurface
    tool: string
    args: JsonObject
    waitpointId?: string
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

  if (mode === "blocked") {
    throw new Error(`Tool is blocked: ${request.tool}`)
  }

  if (mode !== "prompted") {
    throw new Error(`Tool does not require approval: ${request.tool}`)
  }

  if (
    request.surface !== "milo" &&
    findSurfaceIntegration(context, request.surface) === null
  ) {
    throw new Error(`No active ${request.surface} integration is available`)
  }

  const requestedBy = createRequestedBy(context)
  const code = createApprovalCode()
  const approval: { approvalId: Id<"approvals">; expiresAt: number } =
    await ctx.runMutation(internal.approvals.approvals.create, {
      tenantId: context.run.tenantId,
      runId: context.run._id,
      surface: request.surface,
      tool: request.tool,
      ...encodeToolInput(request.args),
      summary: request.summary,
      handoff: request.handoff,
      code,
      waitpointId: args.waitpointId,
      requestedBy,
    })
  const delivery = getSlackApprovalDelivery(context)

  if (delivery !== null) {
    await tryDeliverSlackApproval(ctx, {
      approvalId: approval.approvalId,
      code,
      surface: request.surface,
      tool: request.tool,
      summary: request.summary,
      expiresAt: approval.expiresAt,
      delivery,
    })
  }

  return {
    status: "approval_requested",
    approvalId: approval.approvalId,
    code,
    instruction: `Approval requested. The user can approve with: approve ${code}`,
  }
}

function findSurfaceIntegration(
  context: ApprovalBrokerContext,
  surface: Exclude<ToolSurface, "milo">
) {
  return (
    context.integrations.find(
      (integration) =>
        integration.status === "active" && integration.integration === surface
    ) ?? null
  )
}

async function tryDeliverSlackApproval(
  ctx: ActionCtx,
  args: SlackApprovalRequest
) {
  try {
    await deliverSlackApproval(ctx, args)
  } catch {
    return
  }
}

async function deliverSlackApproval(
  ctx: ActionCtx,
  args: SlackApprovalRequest
) {
  const message = createSlackApprovalRequest({
    code: args.code,
    surface: args.surface,
    tool: args.tool,
    summary: args.summary,
    expiresAt: args.expiresAt,
  })

  const response = await postSlackMessage(args.delivery.integration, {
    channel: args.delivery.channelId,
    thread_ts: args.delivery.threadTs,
    text: message.text,
    blocks: message.blocks,
  })
  const messageTs = readString(response, "ts")

  if (messageTs === undefined) {
    throw new Error("Slack approval message response is missing ts")
  }

  await ctx.runMutation(internal.approvals.approvals.recordDelivery, {
    approvalId: args.approvalId,
    delivery: {
      integration: "slack",
      integrationId: args.delivery.integration._id,
      data: {
        channelId: readString(response, "channel") ?? args.delivery.channelId,
        messageTs,
        ...(args.delivery.threadTs === undefined
          ? {}
          : { threadTs: args.delivery.threadTs }),
      },
    },
  })
}

function createRequestedBy(context: ApprovalBrokerContext): Actor {
  if (context.input.run.createdBy !== undefined) {
    return createUserActor(context.input.run.createdBy)
  }

  if (context.input.type === "automation") {
    const createdBy = context.input.automation.createdBy

    if (createdBy !== undefined) {
      return createUserActor(createdBy)
    }
  }

  if (context.input.type === "message") {
    if (context.input.message.actor !== undefined) {
      return context.input.message.actor
    }
  }

  throw new Error("Approval request requires a known requester")
}

function getSlackApprovalDelivery(
  context: ApprovalBrokerContext
): SlackApprovalDelivery | null {
  const target = getSlackTarget(context.input)

  if (target === null) {
    return null
  }

  const integration = context.integrations.find(
    (candidate) => candidate.integration === "slack"
  )

  if (integration === undefined) {
    return null
  }

  return { ...target, integration }
}

function getSlackTarget(input: AgentRuntimeInput) {
  if (input.type !== "message") {
    return null
  }

  if (input.messageIntegration !== "slack") {
    return null
  }

  const channelId = getSlackChannelId(input.message.data)

  if (channelId === undefined) {
    return null
  }

  return {
    channelId,
    threadTs:
      getSlackThreadTs(input.message.data) ??
      getSlackMessageTs(input.message.data),
  }
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}

function createApprovalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(8)

  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}
