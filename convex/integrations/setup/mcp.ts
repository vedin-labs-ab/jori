import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import {
  type Integration,
  integrationLabel,
  integrations,
} from "../../shared/integrations"
import { tryDeliverSetupOffer } from "./delivery"
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

  const setupRequest = readSetupRequest(request.args)
  const integration = setupRequest.integration
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
    summary: setupRequest.summary,
    source: setupSourceFromInput(context.input),
  })
  const delivery = await tryDeliverSetupOffer(ctx, context, {
    expiresAt: link.expiresAt,
    integration,
    summary: setupRequest.summary,
    url: link.url,
    setupLinkId: link.setupLinkId,
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
        ? `Posted a ${label} setup offer in Slack. Do not send a separate reply for this offer.`
        : `No native setup offer was delivered. Send this setup link if the user needs it: ${link.url}`,
    delivery,
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

function readSetupRequest(args: unknown): {
  integration: Integration
  summary: string
} {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error("offer_integration_setup requires an integration.")
  }

  const integration = (args as { integration?: unknown }).integration

  if (!isIntegration(integration)) {
    throw new Error("offer_integration_setup received an unknown integration.")
  }

  return {
    integration,
    summary: readSummary((args as { summary?: unknown }).summary),
  }
}

function isIntegration(value: unknown): value is Integration {
  return integrations.includes(value as Integration)
}

function readSummary(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("offer_integration_setup requires a summary.")
  }

  return value.trim()
}
