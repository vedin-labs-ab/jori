import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Loader2, MessageSquare } from "lucide-react"
import { useState } from "react"
import { api } from "../../convex/_generated/api"
import { IntegrationConnectionCard } from "./integration"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function SlackConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.slack.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getSlackStatus, { tenantId })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectSlack() {
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
      const installUrl = new URL("/slack/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start Slack install."
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title="Slack"
      description="Connect the Slack workspace that should trigger Milo."
      status={status?.status}
      headline={
        status === undefined
          ? "Checking Slack"
          : (status?.teamName ?? status?.accountId ?? "No workspace connected")
      }
      detail={
        status?.status === "active"
          ? "Milo can receive signed Slack events, search context, and post thread replies as Milo."
          : "Install the Slack app once to enable context search and Milo replies."
      }
      icon={<MessageSquare className="size-4" />}
      error={error}
      actionLabel={
        isConnecting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Connecting Slack
          </>
        ) : (
          <>
            Connect Slack
            <ExternalLink />
          </>
        )
      }
      isConnecting={isConnecting}
      onConnect={connectSlack}
    />
  )
}
