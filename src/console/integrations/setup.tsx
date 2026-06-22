import { useMutation } from "convex/react"
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { readErrorMessage } from "@/console/shared/error"
import { RootStateFrame } from "@/shared/state"
import { api } from "../../../convex/_generated/api"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type SetupState =
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "error"; message: string }

export function IntegrationSetup({ token }: { token: string }) {
  const { retry, state } = useIntegrationSetup(token)

  if (state.status === "connected") {
    return <ConnectedSetupView />
  }

  if (state.status === "error") {
    return <SetupErrorView message={state.message} retry={retry} />
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
          status: "error",
          message:
            "The provider did not finish connecting. Try again when ready.",
        }
      : { status: "connecting" }
  )

  useEffect(() => {
    if (providerError && retryCount === 0) {
      return
    }

    if (!convexSiteUrl) {
      setState({ status: "error", message: "Missing VITE_CONVEX_SITE_URL." })
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
          setState({
            status: "error",
            message: readErrorMessage(
              error,
              "This setup link could not be opened."
            ),
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
  return (
    <RootStateFrame
      action={
        <Button asChild variant="outline">
          <a href="/integrations">View integrations</a>
        </Button>
      }
      description="The integration is connected and available to Milo."
      icon={<CheckCircle2 />}
      title="Integration connected"
    />
  )
}

function SetupErrorView({
  message,
  retry,
}: {
  message: string
  retry: () => void
}) {
  return (
    <RootStateFrame
      action={
        <Button onClick={retry} type="button">
          <RotateCcw />
          Try again
        </Button>
      }
      description={message}
      icon={<AlertTriangle />}
      title="Setup link needs attention"
    />
  )
}

function ConnectingSetupView() {
  return (
    <RootStateFrame
      action={
        <Button disabled type="button">
          <LoaderCircle className="animate-spin" />
          Opening provider
        </Button>
      }
      description="Milo is preparing the authorization request."
      icon={<LoaderCircle className="animate-spin" />}
      title="Connecting integration"
    />
  )
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
