import { useMutation, useQuery } from "convex/react"
import { CalendarDays, ExternalLink, Loader2, Mail } from "lucide-react"
import { type ReactNode, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { IntegrationConnectionCard } from "./card"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type GoogleStatus = {
  accountId: string
  email?: string
  name?: string
  status: "active" | "paused" | "revoked"
} | null

type GoogleSurfaceConfig = {
  action: string
  connectedDetail: string
  connectError: string
  description: string
  emptyDetail: string
  icon: ReactNode
  installPath: string
  label: string
  loading: string
}

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
} satisfies GoogleSurfaceConfig

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
} satisfies GoogleSurfaceConfig

export function GmailConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.google.install.createGmailInstallState
  )
  const status = useQuery(api.context.integrations.getGmailStatus, {
    tenantId,
  })

  return (
    <GoogleSurfaceConnection
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
    <GoogleSurfaceConnection
      config={calendarConfig}
      createInstallState={createInstallState}
      status={status}
      tenantId={tenantId}
    />
  )
}

function GoogleSurfaceConnection({
  config,
  createInstallState,
  status,
  tenantId,
}: {
  config: GoogleSurfaceConfig
  createInstallState: (args: {
    tenantId: string
    returnUrl: string
  }) => Promise<string>
  status: GoogleStatus | undefined
  tenantId: string
}) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectGoogle() {
    if (!convexSiteUrl) {
      setError("Missing VITE_CONVEX_SITE_URL.")
      return
    }

    setError(undefined)
    setIsConnecting(true)

    try {
      const state = await createInstallState({
        tenantId,
        returnUrl: window.location.origin,
      })
      const installUrl = new URL(config.installPath, convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : config.connectError
      )
    }
  }

  return (
    <IntegrationConnectionCard
      title={config.label}
      description={config.description}
      status={status?.status}
      headline={getGoogleHeadline(status, config.label)}
      detail={getGoogleDetail(status?.status, config)}
      icon={config.icon}
      error={error}
      actionLabel={
        <GoogleActionLabel config={config} isConnecting={isConnecting} />
      }
      isConnecting={isConnecting}
      onConnect={connectGoogle}
    />
  )
}

function getGoogleHeadline(status: GoogleStatus | undefined, label: string) {
  if (status === undefined) {
    return `Checking ${label}`
  }

  return (
    status?.name ??
    status?.email ??
    status?.accountId ??
    `No ${label} connected`
  )
}

function getGoogleDetail(
  status: "active" | "paused" | "revoked" | undefined,
  config: GoogleSurfaceConfig
) {
  if (status === "active") {
    return config.connectedDetail
  }

  return config.emptyDetail
}

function GoogleActionLabel({
  config,
  isConnecting,
}: {
  config: GoogleSurfaceConfig
  isConnecting: boolean
}) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        {config.loading}
      </>
    )
  }

  return (
    <>
      {config.action}
      <ExternalLink />
    </>
  )
}
