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
import { api } from "../../../../convex/_generated/api"
import { readErrorMessage } from "../../shared/error"
import { IntegrationLogo } from "../../shared/logo/integration"
import { absoluteTime, formatDuration } from "../../shared/time"
import { type ExecutionItem } from "../types"
import { type RunRequestMeta, RunRequestSection } from "./layout"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type ClaimArgs = FunctionArgs<typeof api.runs.console.offers.claim>
type CancelArgs = FunctionArgs<typeof api.runs.console.offers.cancel>
type Offer = NonNullable<ExecutionItem["offer"]>
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
  offer,
  runId,
  tenantId,
}: {
  now: number
  offer: Offer
  runId: string
  tenantId: string
}) {
  return (
    <RunRequestSection
      actions={
        isLiveOffer(offer, now) ? (
          <OfferActions offer={offer} runId={runId} tenantId={tenantId} />
        ) : undefined
      }
      label="Offer"
      labelIcon={Plug}
      meta={offerMeta(offer, now)}
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
  const [error, setError] = useState<string>()

  async function submit(action: OfferAction) {
    setPendingAction(action)
    setError(undefined)

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
      setError(readErrorMessage(caught, "Could not update integration offer."))
    } finally {
      setPendingAction(undefined)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="text-destructive hover:text-destructive"
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
      {error !== undefined ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : null}
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

  const result = await claim({
    ...offerIds(offer, runId, tenantId),
    returnUrl: runOfferReturnUrl(),
  })

  if (result.status === "connected") {
    return
  }

  const installUrl = new URL(result.installPath, convexSiteUrl)
  installUrl.searchParams.set("state", result.state)
  window.location.assign(installUrl.toString())
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
      tooltip: absoluteTime(offer.expiresAt),
    }
  }

  if (offer.state === "connected") {
    return {
      Icon: Check,
      iconClassName: "text-primary",
      label: `Connected at ${absoluteTime(offer.updatedAt)}`,
      tooltip: absoluteTime(offer.updatedAt),
    }
  }

  if (offer.state === "cancelled") {
    return {
      Icon: X,
      iconClassName: "text-muted-foreground",
      label: `Cancelled at ${absoluteTime(offer.updatedAt)}`,
      tooltip: offer.result?.reason ?? absoluteTime(offer.updatedAt),
    }
  }

  if (offer.state === "expired") {
    return {
      Icon: Clock3,
      iconClassName: "text-warning",
      label: `Expired at ${absoluteTime(offer.expiresAt)}`,
      tooltip: absoluteTime(offer.expiresAt),
    }
  }

  if (offer.state === "failed") {
    return {
      Icon: AlertCircle,
      iconClassName: "text-destructive",
      label: "Integration failed",
      tooltip: offer.result?.error ?? "Milo could not connect this integration",
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
