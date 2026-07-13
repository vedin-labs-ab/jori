import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type Integration } from "../../shared/integrations"
import { type OfferContext } from "./context"

export type IntegrationOfferDeliveryInput = {
  expiresAt: number
  integration: Integration
  integrationOfferId: Id<"integrationOffers">
  summary: string
  url: string
}

export type IntegrationOfferDeliverer = (
  ctx: ActionCtx,
  context: OfferContext,
  input: IntegrationOfferDeliveryInput
) => Promise<{ status: "created" | "delivered" }>
