import { useMutation, useQuery } from "convex/react"
import { CalendarDays, ExternalLink, Loader2, Mail } from "lucide-react"
import { type ReactNode, useState } from "react"
import { api } from "../../../convex/_generated/api"
import { IntegrationConnectionCard } from "./card"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

type MicrosoftStatus = {
  accountId: string
  email?: string
  name?: string
  status: "active" | "paused" | "revoked"
  tenantName?: string
} | null

type MicrosoftSurfaceConfig = {
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
} satisfies MicrosoftSurfaceConfig

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
} satisfies MicrosoftSurfaceConfig

export function MicrosoftEmailConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.microsoft.install.createMicrosoftEmailInstallState
  )
  const status = useQuery(api.context.integrations.getMicrosoftEmailStatus, {
    tenantId,
  })

  return (
    <MicrosoftSurfaceConnection
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
    <MicrosoftSurfaceConnection
      config={calendarConfig}
      createInstallState={createInstallState}
      status={status}
      tenantId={tenantId}
    />
  )
}

function MicrosoftSurfaceConnection({
  config,
  createInstallState,
  status,
  tenantId,
}: {
  config: MicrosoftSurfaceConfig
  createInstallState: (args: {
    tenantId: string
    returnUrl: string
  }) => Promise<string>
  status: MicrosoftStatus | undefined
  tenantId: string
}) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectMicrosoft() {
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
      headline={getMicrosoftHeadline(status, config.label)}
      detail={getMicrosoftDetail(status?.status, config)}
      icon={config.icon}
      error={error}
      actionLabel={
        <MicrosoftActionLabel config={config} isConnecting={isConnecting} />
      }
      isConnecting={isConnecting}
      onConnect={connectMicrosoft}
    />
  )
}

function getMicrosoftHeadline(
  status: MicrosoftStatus | undefined,
  label: string
) {
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

function getMicrosoftDetail(
  status: "active" | "paused" | "revoked" | undefined,
  config: MicrosoftSurfaceConfig
) {
  if (status === "active") {
    return config.connectedDetail
  }

  return config.emptyDetail
}

function MicrosoftActionLabel({
  config,
  isConnecting,
}: {
  config: MicrosoftSurfaceConfig
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
