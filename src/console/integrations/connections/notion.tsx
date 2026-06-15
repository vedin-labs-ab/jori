import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../connection/card"
import { getWorkspaceHeadline } from "../connection/headline"

const notionConfig = {
  action: "Connect Notion",
  connectedDetail:
    "Milo can search shared content, read and update pages, and add comments.",
  connectError: "Could not start the Notion connection.",
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
} satisfies IntegrationConnectionConfig

export function NotionConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.notion.install.createInstallState
  )
  const status = useQuery(api.integrations.status.getNotionStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
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
