import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type ApprovalBrokerContext } from "../../broker/approval"
import { type MiloToolRequest, requiredString } from "../../shared/input"
import {
  type Integration,
  integrationLabel,
  integrations,
} from "../../shared/integrations"
import { tryDeliverIntegrationOffer } from "./delivery"
import { integrationOfferSourceFromInput } from "./source"

const offerTool = "offer_integration"
const cancelOfferTool = "cancel_integration_offer"

export function isIntegrationOfferTool(tool: string) {
  return tool === offerTool
}

export async function callIntegrationOfferTool(
  ctx: ActionCtx,
  context: ApprovalBrokerContext,
  request: MiloToolRequest
) {
  if (!isIntegrationOfferTool(request.tool)) {
    throw new Error(`Unknown integration offer tool: ${request.tool}`)
  }

  if (context.input.type === "automation") {
    throw new Error("Integration offers require an interactive run.")
  }

  const offerRequest = readOfferRequest(request.args)
  const integration = offerRequest.integration
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

  const offer = await ctx.runMutation(
    internal.integrations.offers.records.create,
    {
      tenantId: context.run.tenantId,
      integration,
      summary: offerRequest.summary,
      source: integrationOfferSourceFromInput(context.input),
    }
  )
  const delivery = await tryDeliverIntegrationOffer(ctx, context, {
    expiresAt: offer.expiresAt,
    integration,
    summary: offerRequest.summary,
    url: offer.url,
    integrationOfferId: offer.integrationOfferId,
  })

  return {
    status: delivery.status,
    integration,
    integrationOfferId: offer.integrationOfferId,
    url: offer.url,
    urlPath: offer.urlPath,
    expiresAt: offer.expiresAt,
    message: integrationOfferMessage({
      delivered: delivery.status === "delivered",
      label,
      url: offer.url,
    }),
    delivery,
  }
}

export function isCancelIntegrationOfferTool(tool: string) {
  return tool === cancelOfferTool
}

export async function cancelIntegrationOffer(
  ctx: ActionCtx,
  run: { _id: Id<"runs">; tenantId: string },
  args: unknown
) {
  const input = parseCancelOffer(args)
  const result = await ctx.runMutation(
    internal.integrations.offers.lifecycle.cancelForRun,
    {
      integrationOfferId: input.integrationOfferId,
      runId: run._id,
      tenantId: run.tenantId,
      reason: input.reason,
    }
  )

  return offerCancelResult(result.status)
}

function integrationOfferMessage(args: {
  delivered: boolean
  label: string
  url: string
}) {
  return args.delivered
    ? `Posted a ${args.label} integration offer in Slack. Do not send a separate reply for this offer.`
    : `No native integration offer was delivered. Send this integration offer URL if the user needs it: ${args.url}`
}

function parseCancelOffer(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error(
      "cancel_integration_offer requires an integrationOfferId and reason."
    )
  }

  const record = args as { integrationOfferId?: unknown; reason?: unknown }

  return {
    integrationOfferId: requiredString(
      record.integrationOfferId,
      "integrationOfferId"
    ) as Id<"integrationOffers">,
    reason: requiredString(record.reason, "reason"),
  }
}

function offerCancelResult(status: "cancelled" | "missing" | "settled") {
  if (status === "cancelled") {
    return {
      status: "cancelled" as const,
      message: "Cancelled the pending integration offer.",
    }
  }

  if (status === "missing") {
    return {
      status: "missing" as const,
      message: "No matching pending integration offer was found for this run.",
    }
  }

  return {
    status: "already_resolved" as const,
    message: "That integration offer was already resolved.",
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

function readOfferRequest(args: unknown): {
  integration: Integration
  summary: string
} {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new Error("offer_integration requires an integration.")
  }

  const record = args as {
    integration?: unknown
    summary?: unknown
  }

  if (!isIntegration(record.integration)) {
    throw new Error("offer_integration received an unknown integration.")
  }

  return {
    integration: record.integration,
    summary: readSummary(record.summary),
  }
}

function isIntegration(value: unknown): value is Integration {
  return integrations.includes(value as Integration)
}

function readSummary(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("offer_integration requires a summary.")
  }

  return value.trim()
}
