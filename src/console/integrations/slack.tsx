import { useMutation, useQuery } from "convex/react"
import { MessageSquare } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IntegrationActionLabel, IntegrationConnectionCard } from "./card"
import { useIntegrationInstall } from "./install"

export function SlackConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.slack.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getSlackStatus, { tenantId })
  const install = useIntegrationInstall({
    connectError: "Could not start Slack install.",
    createInstallState,
    installPath: "/slack/install",
    tenantId,
  })

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
      error={install.error}
      actionLabel={
        <IntegrationActionLabel
          action="Connect Slack"
          isConnecting={install.isConnecting}
          loading="Connecting Slack"
        />
      }
      isConnecting={install.isConnecting}
      onConnect={install.connect}
    />
  )
}
