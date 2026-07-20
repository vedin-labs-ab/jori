import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { type ToolPermissionController } from "../../permissions/controller"
import { IntegrationCard, type IntegrationCardConfig } from "../card"
import { getAccountHeadline } from "../card/headline"

const gmailConfig = {
  action: "Connect Gmail",
  connectedDetail:
    "Connected for you only. Milo can read and reply to your email when you ask.",
  connectError: "Couldn't start the Gmail integration.",
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
} satisfies IntegrationCardConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "Connected for you only. Milo can read, create, and update your events when you ask.",
  connectError: "Couldn't start the Google Calendar integration.",
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
} satisfies IntegrationCardConfig

export function GmailIntegration({
  permissions,
  organizationId,
}: {
  permissions: ToolPermissionController
  organizationId: string
}) {
  const createInstallState = useMutation(
    api.integrations.google.install.createGmailInstallState
  )
  const status = useQuery(api.integrations.status.getGmailStatus, {
    organizationId,
  })

  return (
    <IntegrationCard
      config={gmailConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, gmailConfig.label)}
      permissions={permissions}
      status={status}
      organizationId={organizationId}
    />
  )
}

export function GoogleCalendarIntegration({
  permissions,
  organizationId,
}: {
  permissions: ToolPermissionController
  organizationId: string
}) {
  const createInstallState = useMutation(
    api.integrations.google.install.createGoogleCalendarInstallState
  )
  const status = useQuery(api.integrations.status.getGoogleCalendarStatus, {
    organizationId,
  })

  return (
    <IntegrationCard
      config={calendarConfig}
      createInstallState={createInstallState}
      headline={getAccountHeadline(status, calendarConfig.label)}
      permissions={permissions}
      status={status}
      organizationId={organizationId}
    />
  )
}
