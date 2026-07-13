import { useMutation } from "convex/react"
import { useEffect, useMemo, useState } from "react"
import { readErrorMessage } from "@/console/shared/error"
import { FullscreenSkeletonLoader } from "@/shared/loading"
import { api } from "../../../convex/_generated/api"
import { IntegrationOfferOutcome } from "./outcome"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type OfferErrorKind = "expired" | "retryable" | "terminal"

type OfferState =
  | { status: "connecting" }
  | { status: "connected" }
  | { kind: OfferErrorKind; status: "error" }

export function IntegrationOffer({ token }: { token: string }) {
  const { retry, state } = useIntegrationOffer(token)

  if (state.status === "connected") {
    return <ConnectedOfferView />
  }

  if (state.status === "error") {
    return <OfferErrorView kind={state.kind} retry={retry} />
  }

  return <ConnectingOfferView />
}

function useIntegrationOffer(token: string) {
  const claim = useMutation(api.integrations.offers.records.claim)
  const providerError = useMemo(readProviderError, [])
  const [retryCount, setRetryCount] = useState(0)
  const [state, setState] = useState<OfferState>(
    providerError
      ? {
          kind: "retryable",
          status: "error",
        }
      : { status: "connecting" }
  )

  useEffect(() => {
    if (providerError && retryCount === 0) {
      return
    }

    if (!convexSiteUrl) {
      setState({ kind: "terminal", status: "error" })
      return
    }

    let cancelled = false

    async function connect() {
      setState({ status: "connecting" })

      try {
        const result = await claim({
          token,
          returnUrl: integrationOfferReturnUrl(),
        })

        if (cancelled) {
          return
        }

        if (result.status === "connected") {
          setState({ status: "connected" })
          return
        }

        const installUrl = new URL(result.installPath, convexSiteUrl)
        installUrl.searchParams.set("state", result.state)
        window.location.assign(installUrl.toString())
      } catch (error) {
        if (!cancelled) {
          const message = readErrorMessage(
            error,
            "This integration offer could not be opened."
          )

          setState({
            kind: classifyOfferError(message),
            status: "error",
          })
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
    }
  }, [claim, providerError, retryCount, token])

  return { state, retry: () => setRetryCount((count) => count + 1) }
}

function ConnectedOfferView() {
  return <IntegrationOfferOutcome variant="connected" />
}

function OfferErrorView({
  kind,
  retry,
}: {
  kind: OfferErrorKind
  retry: () => void
}) {
  if (kind === "expired") {
    return <IntegrationOfferOutcome variant="expired" />
  }

  if (kind === "terminal") {
    return <IntegrationOfferOutcome variant="terminal" />
  }

  return <IntegrationOfferOutcome onRetry={retry} variant="failed" />
}

function ConnectingOfferView() {
  return <FullscreenSkeletonLoader />
}

function integrationOfferReturnUrl() {
  const url = new URL(window.location.href)

  url.search = ""
  url.hash = ""

  return url.toString()
}

function readProviderError() {
  if (typeof window === "undefined") {
    return false
  }

  const search = new URLSearchParams(window.location.search)

  return Array.from(search.values()).some((value) => value === "error")
}

function classifyOfferError(message: string): OfferErrorKind {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("expired") ||
    normalized.includes("not found") ||
    normalized.includes("already claimed")
  ) {
    return "expired"
  }

  if (
    normalized.includes("missing") ||
    normalized.includes("must be") ||
    normalized.includes("another user")
  ) {
    return "terminal"
  }

  return "retryable"
}
