import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../shared/card"
import { getWorkspaceHeadline } from "../shared/headline"

const slackConfig = {
  action: "Connect Slack",
  connectedDetail:
    "Milo can receive signed Slack events, search context, and post thread replies as Milo.",
  connectError: "Could not start Slack install.",
  emptyDetail:
    "Install the Slack app once to enable context search and Milo replies.",
  installPath: "/slack/install",
  label: "Slack",
  loading: "Connecting Slack",
  logo: {
    alt: "Slack logo",
    src: "https://svgl.app/library/slack.svg",
  },
  provider: "slack",
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
        status?.teamName
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
