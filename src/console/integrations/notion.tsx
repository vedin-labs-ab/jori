import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { getWorkspaceHeadline } from "./headline"
import {
  WorkspaceConnection,
  type WorkspaceConnectionConfig,
} from "./workspace"

const notionConfig = {
  action: "Connect Notion",
  connectedDetail:
    "Milo can search shared Notion content, read pages and records, update pages, append blocks, and add comments.",
  connectError: "Could not start Notion install.",
  emptyDetail:
    "Connect Notion to let Milo use selected workspace pages and databases as context and action surfaces.",
  installPath: "/notion/install",
  label: "Notion",
  loading: "Connecting Notion",
  logo: {
    alt: "Notion logo",
    src: "https://svgl.app/library/notion.svg",
  },
  provider: "notion",
} satisfies WorkspaceConnectionConfig

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
    <WorkspaceConnection
      config={notionConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        notionConfig.label,
        "No workspace connected",
        status?.workspaceName,
        status?.ownerName,
        status?.ownerEmail
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
