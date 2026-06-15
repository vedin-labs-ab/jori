import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import {
  IntegrationConnection,
  type IntegrationConnectionConfig,
} from "../connection/card"
import {
  getAccountHeadline,
  getWorkspaceHeadline,
} from "../connection/headline"

const gmailConfig = {
  action: "Connect Gmail",
  connectedDetail:
    "Connected for you only. Milo can read and reply to your email when you ask.",
  connectError: "Could not start the Gmail connection.",
  emptyDetail:
    "Connect your Gmail account. This connects only you, not the whole organization.",
  installPath: "/gmail/install",
  label: "Gmail",
  loading: "Connecting Gmail",
  logo: {
    alt: "Gmail logo",
    src: "https://svgl.app/library/gmail.svg",
  },
  integration: "gmail",
} satisfies IntegrationConnectionConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "Connected for you only. Milo can read, create, and update your events when you ask.",
  connectError: "Could not start the Google Calendar connection.",
  emptyDetail:
    "Connect your Google Calendar. This connects only you, not the whole organization.",
  installPath: "/google-calendar/install",
  label: "Google Calendar",
  loading: "Connecting Calendar",
  logo: {
    alt: "Google Calendar logo",
    src: "https://svgl.app/library/google-calendar.svg",
  },
  integration: "googleCalendar",
} satisfies IntegrationConnectionConfig

const driveConfig = {
  action: "Connect Drive",
  connectedDetail:
    "Shared with your organization. Milo can search, read, create, and update files when you ask.",
  connectError: "Could not start the Google Drive connection.",
  emptyDetail:
    "Connect Google Drive for your organization. Any run can use it when you ask.",
  installPath: "/google-drive/install",
  label: "Google Drive",
  loading: "Connecting Drive",
  logo: {
    alt: "Google Drive logo",
    src: "https://svgl.app/library/drive.svg",
  },
  integration: "googleDrive",
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
