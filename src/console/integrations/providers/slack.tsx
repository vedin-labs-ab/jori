import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card"
import { getWorkspaceHeadline } from "../card/headline"

const slackConfig = {
  action: "Connect Slack",
  connectedDetail:
    "Milo responds to mentions, searches conversation context, and replies in threads.",
  connectError: "Couldn't start the Slack integration.",
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
} satisfies IntegrationCardConfig

export function SlackIntegration({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.integrations.slack.install.createInstallState
  )
  const status = useQuery(api.integrations.status.getSlackStatus, { tenantId })

  return (
    <IntegrationCard
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
