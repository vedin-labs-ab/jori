import {
  AlertCircle,
  Check,
  Clock3,
  ExternalLink,
  Loader2,
  Plug,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { IntegrationLogo } from "@/shared/logo/integration"
import { showErrorToast } from "../../error"
import { absoluteTime, expirationLabel } from "../../time"
import { type ExecutionOffer } from "../types"
import { useRunRequestCarousel } from "./carousel"
import { type RunRequestMeta, RunRequestSection } from "./section"

type OfferAction = "cancel" | "connect"

/** Where a claimed offer leads: the install page the connect tab should
 *  open, or nowhere, because the integration is connected already. */
export type OfferClaim =
  | { status: "connected" }
  | { status: "ready"; url: string }

type OfferCallbacks = {
  /** Withdraws the offer; a rejection is shown as the failure. */
  onCancel: (offer: ExecutionOffer) => Promise<void>
  /** Claims the offer for the member about to connect it. */
  onClaim: (offer: ExecutionOffer) => Promise<OfferClaim>
}

export function OfferCallout({
  now,
  offers,
  onCancel,
  onClaim,
}: OfferCallbacks & {
  now: number
  offers: ExecutionOffer[]
}) {
  const carousel = useRunRequestCarousel(offers.length)
  const offer = offers[carousel.index] ?? offers[0]

  if (offer === undefined) {
    return null
  }

  return (
    <RunRequestSection
      actions={
        isLiveOffer(offer, now) ? (
          <OfferActions
            key={offer.id}
            offer={offer}
            onCancel={onCancel}
            onClaim={onClaim}
          />
        ) : undefined
      }
      label={{ count: offers.length, singular: "Offer" }}
      labelIcon={Plug}
      meta={offerMeta(offer, now)}
      navigation={{
        count: offers.length,
        index: carousel.index,
        itemLabel: "integration offer",
        onNext: carousel.onNext,
        onPrevious: carousel.onPrevious,
      }}
      summary={offer.summary}
      title={`Connect ${offer.integrationLabel}`}
      titleIcon={
        <IntegrationLogo decorative integration={offer.integration} size="sm" />
      }
    />
  )
}

function OfferActions({
  offer,
  onCancel,
  onClaim,
}: OfferCallbacks & { offer: ExecutionOffer }) {
  const [pendingAction, setPendingAction] = useState<OfferAction>()

  async function submit(action: OfferAction) {
    setPendingAction(action)

    try {
      if (action === "cancel") {
        await onCancel(offer)
      } else {
        await connectOffer(offer, onClaim)
      }
    } catch (caught) {
      showErrorToast(caught, "Couldn't update the integration offer.")
    } finally {
      setPendingAction(undefined)
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        disabled={pendingAction !== undefined}
        onClick={() => void submit("cancel")}
        size="sm"
        type="button"
        variant="outline"
      >
        {pendingAction === "cancel" ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <X data-icon="inline-start" />
        )}
        Cancel
      </Button>
      <Button
        disabled={pendingAction !== undefined}
        onClick={() => void submit("connect")}
        size="sm"
        type="button"
      >
        {pendingAction === "connect" ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <ExternalLink data-icon="inline-start" />
        )}
        Connect
      </Button>
    </div>
  )
}

/** Opens the tab first, while the click can still open one, then sends
 *  it on to the install page or closes it again. */
async function connectOffer(
  offer: ExecutionOffer,
  onClaim: OfferCallbacks["onClaim"]
) {
  const tab = openConnectTab()

  try {
    const claim = await onClaim(offer)

    if (claim.status === "connected") {
      tab.close()
      return
    }

    tab.location.href = claim.url
  } catch (caught) {
    tab.close()
    throw caught instanceof Error
      ? caught
      : new Error("Couldn't open the integration offer.")
  }
}

function openConnectTab() {
  const tab = window.open("about:blank", "_blank")

  if (tab === null) {
    throw new Error("Couldn't open the integration offer.")
  }

  tab.opener = null

  return tab
}

function offerMeta(offer: ExecutionOffer, now: number): RunRequestMeta | null {
  if (offer.state === "pending" || offer.state === "claimed") {
    const hasExpired = now >= offer.expiresAt

    return {
      Icon: Clock3,
      iconClassName: hasExpired ? "text-warning" : undefined,
      label: expirationLabel(offer.expiresAt, now),
    }
  }

  if (offer.state === "connected") {
    return {
      Icon: Check,
      iconClassName: "text-primary",
      label: `Connected at ${absoluteTime(offer.updatedAt)}`,
    }
  }

  if (offer.state === "cancelled") {
    return {
      Icon: X,
      iconClassName: "text-muted-foreground",
      label: `Cancelled at ${absoluteTime(offer.updatedAt)}`,
    }
  }

  if (offer.state === "expired") {
    return {
      Icon: Clock3,
      iconClassName: "text-warning",
      label: `Expired at ${absoluteTime(offer.expiresAt)}`,
    }
  }

  if (offer.state === "failed") {
    return {
      Icon: AlertCircle,
      iconClassName: "text-destructive",
      label: "Integration failed",
    }
  }

  return null
}

function isLiveOffer(offer: ExecutionOffer, now: number) {
  return (
    (offer.state === "pending" || offer.state === "claimed") &&
    offer.expiresAt > now
  )
}
