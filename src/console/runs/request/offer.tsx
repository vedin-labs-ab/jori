import { useMutation } from "convex/react"
import {
  OfferCallout,
  type OfferClaim,
} from "@/shared/console/runs/request/offer"
import {
  type ExecutionItem,
  type ExecutionOffer,
} from "@/shared/console/runs/types"
import { api } from "../../../../convex/_generated/api"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

/** A run's integration offers bound to Convex: claiming one leads to its
 *  install page on the Convex site, cancelling withdraws it, and both are
 *  scoped to the organization the run belongs to. */
export function RunOffers({
  now,
  offers,
  runId,
  organizationId,
}: {
  now: number
  offers: ExecutionOffer[]
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const claim = useMutation(api.runs.console.offers.claim)
  const cancel = useMutation(api.runs.console.offers.cancel)

  return (
    <OfferCallout
      now={now}
      offers={offers}
      onCancel={async (offer) => {
        const result = await cancel(offerIds(offer, runId, organizationId))

        if (result.status !== "cancelled") {
          throw new Error("This integration offer is already resolved.")
        }
      }}
      onClaim={async (offer): Promise<OfferClaim> => {
        const result = await claim({
          ...offerIds(offer, runId, organizationId),
          returnUrl: `${window.location.origin}/runs`,
        })

        return result.status === "connected"
          ? { status: "connected" }
          : { status: "ready", url: installUrl(result).toString() }
      }}
    />
  )
}

function installUrl(result: { installPath: string; state: string }) {
  if (!convexSiteUrl) {
    throw new Error("Missing VITE_CONVEX_SITE_URL.")
  }

  const installUrl = new URL(result.installPath, convexSiteUrl)
  installUrl.searchParams.set("state", result.state)

  return installUrl
}

function offerIds(
  offer: ExecutionOffer,
  runId: ExecutionItem["id"],
  organizationId: string
) {
  return {
    integrationOfferId: offer.id,
    runId,
    organizationId,
  }
}
