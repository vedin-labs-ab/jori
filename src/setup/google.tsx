import { useMutation, useQuery } from "convex/react"
import { CalendarDays, ExternalLink, Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { IntegrationConnectionCard } from "./integration"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function GoogleConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.google.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getGoogleStatus, {
    tenantId,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectGoogle() {
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
      const installUrl = new URL("/google/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start Google Workspace install."
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title="Google Workspace"
      description="Connect the Workspace account Milo can use for Gmail and Calendar."
      status={status?.status}
      headline={getGoogleHeadline(status)}
      detail={getGoogleDetail(status?.status)}
      icon={<GoogleIcon />}
      error={error}
      actionLabel={<GoogleActionLabel isConnecting={isConnecting} />}
      isConnecting={isConnecting}
      onConnect={connectGoogle}
    />
  )
}

function getGoogleHeadline(
  status:
    | {
        accountId: string
        email?: string
        name?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking Google Workspace"
  }

  return (
    status?.name ?? status?.email ?? status?.accountId ?? "No account connected"
  )
}

function getGoogleDetail(status: "active" | "paused" | "revoked" | undefined) {
  if (status === "active") {
    return "Milo can use this account for Gmail context, Gmail replies, and Calendar actions when explicitly requested."
  }

  return "Connect one Workspace account to enable Gmail and Calendar runtime tools."
}

function GoogleActionLabel({ isConnecting }: { isConnecting: boolean }) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        Connecting Google
      </>
    )
  }

  return (
    <>
      Connect Google
      <ExternalLink />
    </>
  )
}

function GoogleIcon() {
  return (
    <div className="flex items-center gap-1">
      <Mail className="size-4" />
      <CalendarDays className="size-4" />
    </div>
  )
}
