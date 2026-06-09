import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Loader2, MessagesSquare } from "lucide-react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { IntegrationConnectionCard } from "./integration"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function MicrosoftConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getMicrosoftStatus, {
    tenantId,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectMicrosoft() {
    if (!convexSiteUrl) {
      setError("Missing VITE_CONVEX_SITE_URL.")
      return
    }

    setError(undefined)
    setIsConnecting(true)

    try {
      const state = await createInstallState({
        tenantId,
        returnUrl: window.location.origin,
      })
      const installUrl = new URL("/microsoft/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start Microsoft install."
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title="Microsoft Teams"
      description="Connect Microsoft 365 for Teams message triggers."
      status={status?.status}
      headline={getMicrosoftHeadline(status)}
      detail={getMicrosoftDetail(status?.status)}
      icon={<MessagesSquare className="size-4" />}
      error={error}
      actionLabel={<MicrosoftActionLabel isConnecting={isConnecting} />}
      isConnecting={isConnecting}
      onConnect={connectMicrosoft}
    />
  )
}

function getMicrosoftHeadline(
  status:
    | {
        accountId: string
        tenantName?: string
        connectedUser?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking Microsoft"
  }

  if (status?.tenantName !== undefined && status.connectedUser !== undefined) {
    return `${status.tenantName} via ${status.connectedUser}`
  }

  return status?.tenantName ?? status?.accountId ?? "No tenant connected"
}

function getMicrosoftDetail(
  status: "active" | "paused" | "revoked" | undefined
) {
  if (status === "active") {
    return "Milo can receive Teams message notifications, read the triggering conversation, and reply through the connected Microsoft account."
  }

  return "Grant tenant consent and connect a Microsoft account for Teams message context and replies."
}

function MicrosoftActionLabel({ isConnecting }: { isConnecting: boolean }) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        Connecting Microsoft
      </>
    )
  }

  return (
    <>
      Connect Microsoft
      <ExternalLink />
    </>
  )
}
