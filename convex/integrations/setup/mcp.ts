import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { postSlackMessage } from "../../broker/tools/slack"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../../providers/slack/data"
import {
  type Integration,
  integrationLabel,
  integrations,
} from "../../shared/integrations"
import { createSlackSetupLinkMessage } from "./slack"
import { setupSourceFromInput } from "./source"

const setupTool = "offer_integration_setup"

type SetupToolRequest = {
  tool: string
  args?: unknown
}

export function isIntegrationSetupTool(tool: string) {
  return tool === setupTool
}

export async function callIntegrationSetupTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  request: SetupToolRequest
) {
  if (!isIntegrationSetupTool(request.tool)) {
    throw new Error(`Unknown integration setup tool: ${request.tool}`)
  }

  if (context.input.type === "automation") {
    throw new Error("Integration setup links require an interactive run.")
  }

  const integration = readRequestedIntegration(request.args)
  const label = integrationLabel(integration)
  const existing = findConnectedIntegration(context, integration)

  if (existing !== null) {
    return {
      status: "connected",
      integration,
      integrationId: existing._id,
      message: `${label} is already connected and available to Milo.`,
    }
  }

  const link = await ctx.runMutation(internal.integrations.setup.links.create, {
    tenantId: context.run.tenantId,
    integration,
    source: setupSourceFromInput(context.input),
  })
  const delivery = await tryDeliverSlackSetupLink(context, {
    integration,
    url: link.url,
  })

  return {
    status: delivery.status,
    integration,
    setupLinkId: link.setupLinkId,
    url: link.url,
    urlPath: link.urlPath,
    expiresAt: link.expiresAt,
    message:
      delivery.status === "delivered"
        ? `Sent a ${label} setup button in Slack.`
        : `Open this link to connect ${label}: ${link.url}`,
    delivery,
  }
}

async function tryDeliverSlackSetupLink(
  context: ApprovalBrokerContext,
  args: {
    integration: Integration
    url: string
  }
) {
  const target = getSlackTarget(context)

  if (target === null) {
    return { status: "created" as const }
  }

  try {
    const message = createSlackSetupLinkMessage(args)

    await postSlackMessage(target.integration, {
      channel: target.channelId,
      thread_ts: target.threadTs,
      text: message.text,
      blocks: message.blocks,
    })

    return {
      status: "delivered" as const,
      surface: "slack" as const,
      channelId: target.channelId,
      threadTs: target.threadTs,
    }
  } catch {
    return { status: "created" as const }
  }
}

function getSlackTarget(context: ApprovalBrokerContext) {
  if (context.input.type !== "message") {
    return null
  }

  if (context.input.messageIntegration !== "slack") {
    return null
  }

  const channelId = getSlackChannelId(context.input.message.data)

  if (channelId === undefined) {
    return null
  }

  return {
    integration: context.input.integration,
    channelId,
    threadTs:
      getSlackThreadTs(context.input.message.data) ??
      getSlackMessageTs(context.input.message.data),
  }
}

function findConnectedIntegration(
  context: ApprovalBrokerContext,
  integration: Integration
) {
  return (
    context.connectedIntegrations.find(
      (candidate) => candidate.integration === integration
    ) ?? null
  )
}

function readRequestedIntegration(args: unknown): Integration {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error("offer_integration_setup requires an integration.")
  }

  const integration = (args as { integration?: unknown }).integration

  if (!isIntegration(integration)) {
    throw new Error("offer_integration_setup received an unknown integration.")
  }

  return integration
}

function isIntegration(value: unknown): value is Integration {
  return integrations.includes(value as Integration)
}
