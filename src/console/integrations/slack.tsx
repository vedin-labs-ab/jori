import { useMutation, useQuery } from "convex/react"
import { MessageSquare } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { IntegrationConnection } from "./card"

export function SlackConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.slack.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getSlackStatus, { tenantId })

  return (
    <IntegrationConnection
      action="Connect Slack"
      connectError="Could not start Slack install."
      createInstallState={createInstallState}
      description="Connect the Slack workspace that should trigger Milo."
      detail={
        status?.status === "active"
          ? "Milo can receive signed Slack events, search context, and post thread replies as Milo."
          : "Install the Slack app once to enable context search and Milo replies."
      }
      headline={
        status === undefined
          ? "Checking Slack"
          : (status?.teamName ?? status?.accountId ?? "No workspace connected")
      }
      icon={<MessageSquare className="size-4" />}
      installPath="/slack/install"
      loading="Connecting Slack"
      status={status?.status}
      tenantId={tenantId}
      title="Slack"
    />
  )
}
