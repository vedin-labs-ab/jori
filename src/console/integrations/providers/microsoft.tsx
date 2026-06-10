import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../shared/card"
import { getAccountHeadline } from "../shared/headline"

const emailConfig = {
  action: "Connect Email",
  connectedDetail:
    "User-scoped. Milo can read, draft, edit, and send Outlook mail from this account when explicitly requested.",
  connectError: "Could not start Microsoft Email install.",
  emptyDetail:
    "Connect your Outlook account. This connection is scoped to you, not the whole tenant.",
  installPath: "/microsoft-email/install",
  label: "Outlook Mail",
  loading: "Connecting Email",
  logo: {
    alt: "Microsoft Outlook logo",
    src: "https://svgl.app/library/microsoft-outlook.svg",
  },
  provider: "microsoftEmail",
} satisfies IntegrationConnectionConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "User-scoped. Milo can read, create, and update this account's Microsoft calendar events when explicitly requested.",
  connectError: "Could not start Microsoft Calendar install.",
  emptyDetail:
    "Connect your Microsoft Calendar account. This connection is scoped to you, not the whole tenant.",
  installPath: "/microsoft-calendar/install",
  label: "Microsoft Calendar",
  loading: "Connecting Calendar",
  logo: {
    alt: "Microsoft logo",
    src: "https://svgl.app/library/microsoft.svg",
  },
  provider: "microsoftCalendar",
} satisfies IntegrationConnectionConfig

export function MicrosoftEmailConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createMicrosoftEmailInstallState
  )
  const status = useQuery(api.integrations.status.getMicrosoftEmailStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      config={emailConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, emailConfig.label)}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function MicrosoftCalendarConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createMicrosoftCalendarInstallState
  )
  const status = useQuery(api.integrations.status.getMicrosoftCalendarStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      config={calendarConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, calendarConfig.label)}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
