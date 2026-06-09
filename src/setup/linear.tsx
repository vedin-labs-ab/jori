import { useMutation, useQuery } from "convex/react"
import { ExternalLink, GitPullRequestArrow, Loader2 } from "lucide-react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { IntegrationConnectionCard } from "./integration"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function LinearConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.linear.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getLinearStatus, {
    tenantId,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectLinear() {
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
      const installUrl = new URL("/linear/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start Linear install."
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title="Linear"
      description="Connect the Linear workspace Milo should watch."
      status={status?.status}
      headline={getLinearHeadline(status)}
      detail={getLinearDetail(status?.status)}
      icon={<GitPullRequestArrow className="size-4" />}
      error={error}
      actionLabel={<LinearActionLabel isConnecting={isConnecting} />}
      isConnecting={isConnecting}
      onConnect={connectLinear}
    />
  )
}

function getLinearHeadline(
  status:
    | {
        accountId: string
        organizationName?: string
        organizationUrlKey?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking Linear"
  }

  return (
    status?.organizationName ??
    status?.organizationUrlKey ??
    status?.accountId ??
    "No workspace connected"
  )
}

function getLinearDetail(status: "active" | "paused" | "revoked" | undefined) {
  if (status === "active") {
    return "Milo can receive signed Linear issue and comment events, read issue context, and post issue comments."
  }

  return "Install Milo as a Linear app user to enable issue comments and mention-based triggers."
}

function LinearActionLabel({ isConnecting }: { isConnecting: boolean }) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        Connecting Linear
      </>
    )
  }

  return (
    <>
      Connect Linear
      <ExternalLink />
    </>
  )
}
