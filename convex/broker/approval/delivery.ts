import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { createSlackApprovalRequest } from "../../approvals/slack/blocks"
import { replyAddress } from "../../messages/surface"
import { type ToolSurface } from "../../permissions/catalog"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../../providers/slack/data"
import { postSlackMessage } from "../../providers/slack/delivery/messages"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { sendSurfaceReply } from "../../runtime/surface/reply"

type ApprovalDeliveryContext = {
  input: AgentRuntimeInput
  integrations: Doc<"integrations">[]
}

type ApprovalDeliveryArgs = {
  approvalId: Id<"approvals">
  code: string
  replyTarget?: string
  surface: ToolSurface
  tool: string
  summary: string
  expiresAt: number
}

type SlackApprovalDelivery = {
  integration: Doc<"integrations">
  channelId: string
  threadTs?: string
}

export async function deliverApprovalRequest(
  ctx: ActionCtx,
  context: ApprovalDeliveryContext,
  args: ApprovalDeliveryArgs
) {
  try {
    await deliverApproval(ctx, context, args)
  } catch (caught) {
    const message = errorMessage(caught)

    await ctx.runMutation(internal.approvals.approvals.recordDeliveryFailure, {
      approvalId: args.approvalId,
      failure: {
        failedAt: Date.now(),
        message,
        operation: deliveryOperation(context),
        surface: deliverySurface(context, args),
      },
    })

    throw new Error(
      `Approval delivery failed for ${args.surface}.${args.tool}: ${message}`
    )
  }
}

async function deliverApproval(
  ctx: ActionCtx,
  context: ApprovalDeliveryContext,
  args: ApprovalDeliveryArgs
) {
  const slackDelivery = getSlackApprovalDelivery(context)

  if (slackDelivery !== null) {
    await deliverSlackApproval(ctx, {
      ...args,
      delivery: slackDelivery,
    })
    return
  }

  await deliverTextApproval(ctx, context.input, args)
}

async function deliverSlackApproval(
  ctx: ActionCtx,
  args: ApprovalDeliveryArgs & { delivery: SlackApprovalDelivery }
) {
  const message = createSlackApprovalRequest(args)
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

async function deliverTextApproval(
  ctx: ActionCtx,
  input: AgentRuntimeInput,
  args: ApprovalDeliveryArgs
) {
  if (input.type !== "message") {
    throw new Error(`Cannot deliver approval requests for ${input.type} runs.`)
  }

  const address = replyAddress(input.message, args.replyTarget)

  if (address === null) {
    throw new Error(
      `Cannot resolve a ${input.messageIntegration} reply target for approval delivery.`
    )
  }

  await sendSurfaceReply(ctx, input, address, {
    text: textApprovalRequest(args),
  })
}

function textApprovalRequest(args: ApprovalDeliveryArgs) {
  return [
    "Approval required.",
    args.summary,
    `Reply with \`approve ${args.code}\` to allow it, or \`deny ${args.code}\` to skip it.`,
  ].join("\n\n")
}

function getSlackApprovalDelivery(
  context: ApprovalDeliveryContext
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
  if (input.type !== "message" || input.messageIntegration !== "slack") {
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

function deliverySurface(
  context: ApprovalDeliveryContext,
  args: ApprovalDeliveryArgs
) {
  return context.input.type === "message"
    ? context.input.messageIntegration
    : args.surface
}

function deliveryOperation(context: ApprovalDeliveryContext) {
  if (getSlackApprovalDelivery(context) !== null) {
    return "slack.approval_message"
  }

  return "surface.text_reply"
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}
