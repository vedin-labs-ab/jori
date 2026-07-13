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
import { IntegrationLogo } from "@/shared/logo/integration"
import { api } from "../../../../convex/_generated/api"
import { showErrorToast } from "../../shared/error"
import { absoluteTime, formatDuration } from "../../shared/time"
import { type ExecutionOffer } from "../types"
import { useRunRequestCarousel } from "./carousel"
import { type RunRequestMeta, RunRequestSection } from "./section"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type ClaimArgs = FunctionArgs<typeof api.runs.console.offers.claim>
type CancelArgs = FunctionArgs<typeof api.runs.console.offers.cancel>
type Offer = ExecutionOffer
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
  tenantId,
}: {
  now: number
  offers: Offer[]
  runId: string
  tenantId: string
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
            tenantId={tenantId}
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
  tenantId,
}: {
  offer: Offer
  runId: string
  tenantId: string
}) {
  const claim = useMutation(api.runs.console.offers.claim)
  const cancel = useMutation(api.runs.console.offers.cancel)
  const [pendingAction, setPendingAction] = useState<OfferAction>()

  async function submit(action: OfferAction) {
    setPendingAction(action)

    try {
      if (action === "cancel") {
        const result = await cancel(cancelArgs(offer, runId, tenantId))

        if (result.status !== "cancelled") {
          throw new Error("This integration offer is already resolved.")
        }
      } else {
        await connectOffer(claim, offer, runId, tenantId)
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
  offer: Offer,
  runId: string,
  tenantId: string
) {
  if (!convexSiteUrl) {
    throw new Error("Missing VITE_CONVEX_SITE_URL.")
  }

  const tab = openConnectTab()

  try {
    const result = await claim({
      ...offerIds(offer, runId, tenantId),
      returnUrl: runOfferReturnUrl(),
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

function cancelArgs(offer: Offer, runId: string, tenantId: string): CancelArgs {
  return offerIds(offer, runId, tenantId)
}

function offerIds(offer: Offer, runId: string, tenantId: string) {
  return {
    integrationOfferId: offer.id as ClaimArgs["integrationOfferId"],
    runId: runId as ClaimArgs["runId"],
    tenantId,
  }
}

function runOfferReturnUrl() {
  return `${window.location.origin}/runs`
}

function expirationLabel(offer: Offer, now: number) {
  if (now >= offer.expiresAt) {
    return `Expired at ${absoluteTime(offer.expiresAt)}`
  }

  return `Expires in ${formatDuration(Math.max(0, offer.expiresAt - now))}`
}

function offerMeta(offer: Offer, now: number): RunRequestMeta | null {
  if (offer.state === "pending" || offer.state === "claimed") {
    const hasExpired = now >= offer.expiresAt

    return {
      Icon: Clock3,
      iconClassName: hasExpired ? "text-warning" : undefined,
      label: expirationLabel(offer, now),
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

function isLiveOffer(offer: Offer, now: number) {
  return (
    (offer.state === "pending" || offer.state === "claimed") &&
    offer.expiresAt > now
  )
}
