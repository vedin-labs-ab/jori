import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { IntegrationConnection } from "./card"

const slackLogo = {
  alt: "Slack logo",
  src: "https://svgl.app/library/slack.svg",
}

export function SlackConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.slack.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getSlackStatus, { tenantId })

  return (
    <IntegrationConnection
      action="Connect Slack"
      connectError="Could not start Slack install."
      createInstallState={createInstallState}
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
      installPath="/slack/install"
      loading="Connecting Slack"
      logo={slackLogo}
      permissions={permissions}
      provider="slack"
      status={status?.status}
      tenantId={tenantId}
      title="Slack"
    />
  )
}
