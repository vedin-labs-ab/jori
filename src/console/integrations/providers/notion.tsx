import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card"
import { getWorkspaceHeadline } from "../card/headline"

const notionConfig = {
  action: "Connect Notion",
  connectedDetail:
    "Milo can search shared content, read and update pages, and add comments.",
  connectError: "Couldn't start the Notion integration.",
  emptyDetail:
    "Connect Notion so Milo can work with the pages and databases you share.",
  installPath: "/notion/install",
  label: "Notion",
  loading: "Connecting Notion",
  logo: {
    alt: "Notion logo",
    src: "https://svgl.app/library/notion.svg",
  },
  integration: "notion",
} satisfies IntegrationCardConfig

export function NotionIntegration({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.integrations.notion.install.createInstallState
  )
  const status = useQuery(api.integrations.status.getNotionStatus, {
    tenantId,
  })

  return (
    <IntegrationCard
      config={notionConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        notionConfig.label,
        "No workspace connected",
        status?.name
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
