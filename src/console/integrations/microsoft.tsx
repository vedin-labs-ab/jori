import { useMutation, useQuery } from "convex/react"
import { CalendarDays, Mail } from "lucide-react"
import { api } from "../../../convex/_generated/api"
import { AccountConnection, type AccountConnectionConfig } from "./account"

const emailConfig = {
  action: "Connect Email",
  connectedDetail:
    "User-scoped. Milo can read, draft, edit, and send Outlook mail from this account when explicitly requested.",
  connectError: "Could not start Microsoft Email install.",
  description:
    "Connect the Outlook account Milo can use for email context and replies.",
  emptyDetail:
    "Connect your Outlook account. This connection is scoped to you, not the whole tenant.",
  icon: <Mail className="size-4" />,
  installPath: "/microsoft-email/install",
  label: "Microsoft Email",
  loading: "Connecting Email",
} satisfies AccountConnectionConfig

const calendarConfig = {
  action: "Connect Calendar",
  connectedDetail:
    "User-scoped. Milo can read, create, and update this account's Microsoft calendar events when explicitly requested.",
  connectError: "Could not start Microsoft Calendar install.",
  description:
    "Connect the Microsoft Calendar account Milo can use for scheduling work.",
  emptyDetail:
    "Connect your Microsoft Calendar account. This connection is scoped to you, not the whole tenant.",
  icon: <CalendarDays className="size-4" />,
  installPath: "/microsoft-calendar/install",
  label: "Microsoft Calendar",
  loading: "Connecting Calendar",
} satisfies AccountConnectionConfig

export function MicrosoftEmailConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createMicrosoftEmailInstallState
  )
  const status = useQuery(api.context.integrations.getMicrosoftEmailStatus, {
    tenantId,
  })

  return (
    <AccountConnection
      config={emailConfig}
      createInstallState={createInstallState}
      status={status}
      tenantId={tenantId}
    />
  )
}

export function MicrosoftCalendarConnection({
  tenantId,
}: {
  tenantId: string
}) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createMicrosoftCalendarInstallState
  )
  const status = useQuery(api.context.integrations.getMicrosoftCalendarStatus, {
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
