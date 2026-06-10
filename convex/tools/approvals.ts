import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  getToolPermission,
  type PermissionMode,
  resolveToolMode,
  type ToolProvider,
} from "../permissions/catalog"
import { type Provider } from "../providers/catalog"
import { type CodexRuntimeInput } from "../runs/codex"
import { type Actor } from "../schemas/actors"
import { parsePromptedToolApproval } from "./approvalArgs"
import { callProviderTool } from "./providers"

export type ApprovalBrokerContext = {
  execution: Doc<"executions">
  input: CodexRuntimeInput
  integrations: Doc<"integrations">[]
  toolModes: ReadonlyMap<string, PermissionMode>
}

export async function createPromptedToolApproval(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  args: {
    provider: ToolProvider
    tool: string
    args: Record<string, unknown>
  }
) {
  const request = parsePromptedToolApproval(args)
  const permission = getToolPermission(request.tool)

  if (permission === undefined || permission.provider !== request.provider) {
    throw new Error(`Unknown ${request.provider} tool: ${request.tool}`)
  }

  const mode = resolveToolMode(context.toolModes, request.tool)

  if (mode === "blocked") {
    throw new Error(`Tool is blocked: ${request.tool}`)
  }

  if (mode !== "prompted") {
    throw new Error(`Tool does not require approval: ${request.tool}`)
  }

  if (
    request.provider !== "milo" &&
    findProviderIntegration(context, request.provider) === null
  ) {
    throw new Error(`No active ${request.provider} integration is available`)
  }

  const requestedBy = createRequestedBy(context)
  const code = createApprovalCode()
  const approvalId = await ctx.runMutation(
    internal.approvals.approvals.create,
    {
      tenantId: context.execution.tenantId,
      executionId: context.execution._id,
      provider: request.provider,
      tool: request.tool,
      args: request.args,
      summary: request.summary,
      handoff: request.handoff,
      code,
      requestedBy,
    }
  )
  const delivery = getSlackApprovalDelivery(context)

  if (delivery !== null) {
    await callProviderTool({
      integration: delivery.integration,
      tool: "conversations_add_message",
      toolArgs: {
        channel: delivery.channelId,
        thread_ts: delivery.threadTs,
        text: formatApprovalRequest({
          code,
          provider: request.provider,
          tool: request.tool,
          summary: request.summary,
        }),
      },
    })
  }

  return {
    status: "approval_requested",
    approvalId,
    code,
    instruction: `Stop now. The user can approve with: approve ${code}`,
  }
}

function findProviderIntegration(
  context: ApprovalBrokerContext,
  provider: Exclude<ToolProvider, "milo">
) {
  return (
    context.integrations.find(
      (integration) =>
        integration.status === "active" && integration.provider === provider
    ) ?? null
  )
}

function createRequestedBy(context: ApprovalBrokerContext): Actor {
  if (context.input.trigger.createdBy !== undefined) {
    return { userId: context.input.trigger.createdBy }
  }

  if (context.input.type === "scheduled") {
    const createdBy = context.input.schedule.createdBy

    if (createdBy !== undefined) {
      return { userId: createdBy }
    }
  }

  if (context.input.type === "message") {
    if (context.input.message.actorEmail !== undefined) {
      return { email: context.input.message.actorEmail }
    }

    if (context.input.message.actorId !== undefined) {
      return {
        provider: context.input.provider,
        externalId: context.input.message.actorId,
      }
    }
  }

  throw new Error("Approval request requires a known requester")
}

function getSlackApprovalDelivery(context: ApprovalBrokerContext) {
  const target = getSlackTarget(context.input)

  if (target === null) {
    return null
  }

  const integration = context.integrations.find(
    (candidate) => candidate.provider === "slack"
  )

  if (integration === undefined) {
    return null
  }

  return { ...target, integration }
}

function getSlackTarget(input: CodexRuntimeInput) {
  if (input.type === "scheduled") {
    return {
      channelId: input.schedule.output.channelId,
      threadTs: input.schedule.output.threadId,
    }
  }

  if (input.provider !== "slack") {
    return null
  }

  const channelId = readString(input.message.data, "channelId")

  if (channelId === undefined) {
    return null
  }

  return {
    channelId,
    threadTs:
      readString(input.message.data, "threadTs") ??
      readString(input.message.data, "ts"),
  }
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}

function formatApprovalRequest(args: {
  code: string
  provider: Provider
  tool: string
  summary: string
}) {
  return [
    `Milo needs approval ${args.code}.`,
    "",
    args.summary,
    "",
    `Tool: ${args.provider}.${args.tool}`,
    "",
    `Reply "approve ${args.code}" to approve or "deny ${args.code}" to deny.`,
    "This approval expires in 30 minutes.",
  ].join("\n")
}

function createApprovalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(8)

  crypto.getRandomValues(bytes)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}
