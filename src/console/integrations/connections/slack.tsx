import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../connection/card"
import { getWorkspaceHeadline } from "../connection/headline"

const slackConfig = {
  action: "Connect Slack",
  connectedDetail:
    "Milo responds to mentions, searches conversation context, and replies in threads.",
  connectError: "Could not start the Slack connection.",
  emptyDetail:
    "Install the Slack app so Milo can respond to mentions where your team talks.",
  installPath: "/slack/install",
  label: "Slack",
  loading: "Connecting Slack",
  logo: {
    alt: "Slack logo",
    src: "https://svgl.app/library/slack.svg",
  },
  integration: "slack",
} satisfies IntegrationConnectionConfig

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
  const status = useQuery(api.integrations.status.getSlackStatus, { tenantId })

  return (
    <IntegrationConnection
      config={slackConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        slackConfig.label,
        "No workspace connected",
        status?.name
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
