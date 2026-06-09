import { useMutation, useQuery } from "convex/react"
import { CalendarDays, Mail } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { AccountConnection, type AccountConnectionConfig } from "./account"

const gmailConfig = {
  action: "Connect Email",
  connectedDetail:
    "User-scoped. Milo can read Gmail context and reply from this account when explicitly requested.",
  connectError: "Could not start Email install.",
  description:
    "Connect the Gmail account Milo can use for email context and replies.",
  emptyDetail:
    "Connect your Gmail account. This connection is scoped to you, not the whole tenant.",
  icon: <Mail className="size-4" />,
  installPath: "/gmail/install",
  label: "Email",
  loading: "Connecting Email",
} satisfies AccountConnectionConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "User-scoped. Milo can read, create, and update this account's calendar events when explicitly requested.",
  connectError: "Could not start Calendar install.",
  description:
    "Connect the Google Calendar account Milo can use for scheduling work.",
  emptyDetail:
    "Connect your Google Calendar account. This connection is scoped to you, not the whole tenant.",
  icon: <CalendarDays className="size-4" />,
  installPath: "/google-calendar/install",
  label: "Calendar",
  loading: "Connecting Calendar",
} satisfies AccountConnectionConfig

export function GmailConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.google.install.createGmailInstallState
  )
  const status = useQuery(api.context.integrations.getGmailStatus, {
    tenantId,
  })

  return (
    <AccountConnection
      config={gmailConfig}
      createInstallState={createInstallState}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function GoogleCalendarConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.google.install.createGoogleCalendarInstallState
  )
  const status = useQuery(api.context.integrations.getGoogleCalendarStatus, {
    tenantId,
  })

  return (
    <AccountConnection
      config={calendarConfig}
      createInstallState={createInstallState}
      status={status}
      tenantId={tenantId}
    />
  )
}
