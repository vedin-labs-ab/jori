import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card"
import { getAccountHeadline } from "../card/headline"

const emailConfig = {
  action: "Connect Outlook",
  connectedDetail:
    "Connected for you only. Milo can read, draft, and send your mail when you ask.",
  connectError: "Couldn't start the Outlook integration.",
  emptyDetail:
    "Connect your Outlook account. This connects only you, not the whole organization.",
  installPath: "/microsoft-email/install",
  label: "Outlook Mail",
  loading: "Connecting Outlook",
  logo: {
    alt: "Microsoft Outlook logo",
    src: "https://svgl.app/library/microsoft-outlook.svg",
  },
  integration: "microsoftEmail",
} satisfies IntegrationCardConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "Connected for you only. Milo can read, create, and update your events when you ask.",
  connectError: "Couldn't start the Microsoft Calendar integration.",
  emptyDetail:
    "Connect your Microsoft Calendar. This connects only you, not the whole organization.",
  installPath: "/microsoft-calendar/install",
  label: "Microsoft Calendar",
  loading: "Connecting Calendar",
  logo: {
    alt: "Microsoft logo",
    src: "https://svgl.app/library/microsoft.svg",
  },
  integration: "microsoftCalendar",
} satisfies IntegrationCardConfig

export function MicrosoftEmailIntegration({
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
    <IntegrationCard
      config={emailConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, emailConfig.label)}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function MicrosoftCalendarIntegration({
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
    <IntegrationCard
      config={calendarConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, calendarConfig.label)}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}
