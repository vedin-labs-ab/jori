import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { type ToolPermissionController } from "../permissions/controller"
import { IntegrationConnection } from "./card"

const notionLogo = {
  alt: "Notion logo",
  src: "https://svgl.app/library/notion.svg",
}

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
  const status = useQuery(api.context.integrations.getNotionStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      action="Connect Notion"
      connectError="Could not start Notion install."
      createInstallState={createInstallState}
      detail={getNotionDetail(status?.status)}
      headline={getNotionHeadline(status)}
      installPath="/notion/install"
      loading="Connecting Notion"
      logo={notionLogo}
      permissions={permissions}
      provider="notion"
      status={status?.status}
      tenantId={tenantId}
      title="Notion"
    />
  )
}

function getNotionHeadline(
  status:
    | {
        accountId: string
        ownerEmail?: string
        ownerName?: string
        workspaceName?: string
      }
    | null
    | undefined
) {
  if (status === undefined) {
    return "Checking Notion"
  }

  return (
    status?.workspaceName ??
    status?.ownerName ??
    status?.ownerEmail ??
    status?.accountId ??
    "No workspace connected"
  )
}

function getNotionDetail(status: "active" | "paused" | "revoked" | undefined) {
  if (status === "active") {
    return "Milo can search shared Notion content, read pages and records, update pages, append blocks, and add comments."
  }

  return "Connect Notion to let Milo use selected workspace pages and databases as context and action surfaces."
}
