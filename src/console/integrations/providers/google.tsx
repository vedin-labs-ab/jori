import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../shared/card"
import { getAccountHeadline, getWorkspaceHeadline } from "../shared/headline"

const gmailConfig = {
  action: "Connect Email",
  connectedDetail:
    "User-scoped. Milo can read Gmail context and reply from this account when explicitly requested.",
  connectError: "Could not start Email install.",
  emptyDetail:
    "Connect your Gmail account. This connection is scoped to you, not the whole tenant.",
  installPath: "/gmail/install",
  label: "Gmail",
  loading: "Connecting Email",
  logo: {
    alt: "Gmail logo",
    src: "https://svgl.app/library/gmail.svg",
  },
  provider: "gmail",
} satisfies IntegrationConnectionConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "User-scoped. Milo can read, create, and update this account's calendar events when explicitly requested.",
  connectError: "Could not start Calendar install.",
  emptyDetail:
    "Connect your Google Calendar account. This connection is scoped to you, not the whole tenant.",
  installPath: "/google-calendar/install",
  label: "Google Calendar",
  loading: "Connecting Calendar",
  logo: {
    alt: "Google Calendar logo",
    src: "https://svgl.app/library/google-calendar.svg",
  },
  provider: "googleCalendar",
} satisfies IntegrationConnectionConfig

const driveConfig = {
  action: "Connect Drive",
  connectedDetail:
    "Tenant-scoped. Milo can search, read, create, and update files in the connected Drive when explicitly requested.",
  connectError: "Could not start Drive install.",
  emptyDetail:
    "Connect Google Drive for this tenant. Milo can use the connection across tenant runs when explicitly requested.",
  installPath: "/google-drive/install",
  label: "Google Drive",
  loading: "Connecting Drive",
  logo: {
    alt: "Google Drive logo",
    src: "https://svgl.app/library/drive.svg",
  },
  provider: "googleDrive",
} satisfies IntegrationConnectionConfig

export function GmailConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.google.install.createGmailInstallState
  )
  const status = useQuery(api.integrations.status.getGmailStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      config={gmailConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, gmailConfig.label)}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function GoogleDriveConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.google.install.createGoogleDriveInstallState
  )
  const status = useQuery(api.integrations.status.getGoogleDriveStatus, {
    tenantId,
  })

  return (
    <IntegrationConnection
      config={driveConfig}
      createInstallState={createInstallState}
      headline={getWorkspaceHeadline(
        status,
        driveConfig.label,
        "No Drive connected",
        status?.name,
        status?.email
      )}
      permissions={permissions}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function GoogleCalendarConnection({
  permissions,
  tenantId,
}: {
  permissions: ToolPermissionController
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.google.install.createGoogleCalendarInstallState
  )
  const status = useQuery(api.integrations.status.getGoogleCalendarStatus, {
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
