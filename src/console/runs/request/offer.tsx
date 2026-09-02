import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
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
import { showErrorToast } from "@/shared/console/error"
import { absoluteTime, expirationLabel } from "@/shared/console/time"
import { IntegrationLogo } from "@/shared/logo/integration"
import { api } from "../../../../convex/_generated/api"
import { type ExecutionItem, type ExecutionOffer } from "../types"
import { useRunRequestCarousel } from "./carousel"
import { type RunRequestMeta, RunRequestSection } from "./section"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type ClaimArgs = FunctionArgs<typeof api.runs.console.offers.claim>
type OfferAction = "cancel" | "connect"
type ClaimResult =
  | {
      expiresAt: number
      installPath: string
      state: string
      status: "ready"
    }
  | {
      integrationId?: string
      status: "connected"
    }

export function OfferCallout({
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
            runId={runId}
            organizationId={organizationId}
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
  runId,
  organizationId,
}: {
  offer: ExecutionOffer
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const claim = useMutation(api.runs.console.offers.claim)
  const cancel = useMutation(api.runs.console.offers.cancel)
  const [pendingAction, setPendingAction] = useState<OfferAction>()

  async function submit(action: OfferAction) {
    setPendingAction(action)

    try {
      if (action === "cancel") {
        const result = await cancel(offerIds(offer, runId, organizationId))

        if (result.status !== "cancelled") {
          throw new Error("This integration offer is already resolved.")
        }
      } else {
        await connectOffer(claim, offer, runId, organizationId)
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

async function connectOffer(
  claim: (args: ClaimArgs) => Promise<ClaimResult>,
  offer: ExecutionOffer,
  runId: ExecutionItem["id"],
  organizationId: string
) {
  if (!convexSiteUrl) {
    throw new Error("Missing VITE_CONVEX_SITE_URL.")
  }

  const tab = openConnectTab()

  try {
    const result = await claim({
      ...offerIds(offer, runId, organizationId),
      returnUrl: `${window.location.origin}/runs`,
    })

    if (result.status === "connected") {
      tab.close()
      return
    }

    tab.location.href = installUrl(result).toString()
  } catch (caught) {
    tab.close()
    throw caught instanceof Error
      ? caught
      : new Error("Couldn't open the integration offer.")
  }
}

function installUrl(result: Extract<ClaimResult, { status: "ready" }>) {
  const installUrl = new URL(result.installPath, convexSiteUrl)
  installUrl.searchParams.set("state", result.state)

  return installUrl
}

function openConnectTab() {
  const tab = window.open("about:blank", "_blank")

  if (tab === null) {
    throw new Error("Couldn't open the integration offer.")
  }

  tab.opener = null

  return tab
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
