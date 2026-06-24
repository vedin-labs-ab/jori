import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { requiredString } from "../../shared/input"
import {
  type Integration,
  integrationLabel,
  integrations,
} from "../../shared/integrations"
import { tryDeliverSetupOffer } from "./delivery"
import { setupSourceFromInput } from "./source"

const setupTool = "offer_integration_setup"
const cancelOfferTool = "cancel_connection_offer"

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
    awaited: setupRequest.wait,
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
    waiting: setupRequest.wait,
    message: setupOfferMessage({
      delivered: delivery.status === "delivered",
      label,
      url: link.url,
      wait: setupRequest.wait,
    }),
    delivery,
  }
}

export function isCancelConnectionOfferTool(tool: string) {
  return tool === cancelOfferTool
}

export async function cancelConnectionOffer(
  ctx: ActionCtx,
  run: { _id: Id<"runs">; tenantId: string },
  args: unknown
) {
  const input = parseCancelOffer(args)
  const result = await ctx.runMutation(
    internal.integrations.setup.lifecycle.cancelForRun,
    {
      setupLinkId: input.setupLinkId,
      runId: run._id,
      tenantId: run.tenantId,
      reason: input.reason,
    }
  )

  return offerCancelResult(result.status)
}

function setupOfferMessage(args: {
  delivered: boolean
  label: string
  url: string
  wait: boolean
}) {
  const base = args.delivered
    ? `Posted a ${args.label} setup offer in Slack. Do not send a separate reply for this offer.`
    : `No native setup offer was delivered. Send this setup link if the user needs it: ${args.url}`

  if (!args.wait) {
    return base
  }

  return `${base} The run is paused until ${args.label} connects, the offer is cancelled, or it expires.`
}

function parseCancelOffer(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error(
      "cancel_connection_offer requires a setupLinkId and reason."
    )
  }

  const record = args as { setupLinkId?: unknown; reason?: unknown }

  return {
    setupLinkId: requiredString(
      record.setupLinkId,
      "setupLinkId"
    ) as Id<"setupLinks">,
    reason: requiredString(record.reason, "reason"),
  }
}

function offerCancelResult(status: "cancelled" | "missing" | "settled") {
  if (status === "cancelled") {
    return {
      status: "cancelled" as const,
      message: "Cancelled the pending connection offer.",
    }
  }

  if (status === "missing") {
    return {
      status: "missing" as const,
      message: "No matching pending connection offer was found for this run.",
    }
  }

  return {
    status: "already_resolved" as const,
    message: "That connection offer was already resolved.",
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
  wait: boolean
} {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error("offer_integration_setup requires an integration.")
  }

  const record = args as {
    integration?: unknown
    summary?: unknown
    wait?: unknown
  }

  if (!isIntegration(record.integration)) {
    throw new Error("offer_integration_setup received an unknown integration.")
  }

  return {
    integration: record.integration,
    summary: readSummary(record.summary),
    wait: record.wait === true,
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
