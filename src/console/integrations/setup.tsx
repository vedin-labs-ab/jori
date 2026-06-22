import { useMutation } from "convex/react"
import { useEffect, useMemo, useState } from "react"
import { readErrorMessage } from "@/console/shared/error"
import { FullscreenSkeletonLoader } from "@/console/shared/loading"
import { api } from "../../../convex/_generated/api"
import { IntegrationSetupOutcome } from "./outcome"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type SetupErrorKind = "expired" | "retryable" | "terminal"

type SetupState =
  | { status: "connecting" }
  | { status: "connected" }
  | { kind: SetupErrorKind; status: "error" }

export function IntegrationSetup({ token }: { token: string }) {
  const { retry, state } = useIntegrationSetup(token)

  if (state.status === "connected") {
    return <ConnectedSetupView />
  }

  if (state.status === "error") {
    return <SetupErrorView kind={state.kind} retry={retry} />
  }

  return <ConnectingSetupView />
}

function useIntegrationSetup(token: string) {
  const claim = useMutation(api.integrations.setup.links.claim)
  const providerError = useMemo(readProviderError, [])
  const [retryCount, setRetryCount] = useState(0)
  const [state, setState] = useState<SetupState>(
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
        const result = await claim({ token, returnUrl: setupReturnUrl() })

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
            "This setup link could not be opened."
          )

          setState({
            kind: classifySetupError(message),
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

function ConnectedSetupView() {
  return <IntegrationSetupOutcome variant="connected" />
}

function SetupErrorView({
  kind,
  retry,
}: {
  kind: SetupErrorKind
  retry: () => void
}) {
  if (kind === "expired") {
    return <IntegrationSetupOutcome variant="expired" />
  }

  if (kind === "terminal") {
    return <IntegrationSetupOutcome variant="terminal" />
  }

  return <IntegrationSetupOutcome onRetry={retry} variant="failed" />
}

function ConnectingSetupView() {
  return <FullscreenSkeletonLoader />
}

function setupReturnUrl() {
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

function classifySetupError(message: string): SetupErrorKind {
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
