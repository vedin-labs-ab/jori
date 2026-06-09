import { ExternalLink, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { IntegrationPermissions } from "../permissions"
import {
  type ToolPermissionController,
  type ToolProvider,
} from "../permissions/controller"
import { type CreateInstallState, useIntegrationInstall } from "./install"

export type ConnectionStatus = "active" | "paused" | "revoked" | undefined

export type IntegrationLogo = {
  alt: string
  src: string
}

export function IntegrationConnection({
  action,
  connectError,
  createInstallState,
  detail,
  headline,
  installPath,
  loading,
  logo,
  permissions,
  provider,
  status,
  tenantId,
  title,
}: {
  action: string
  connectError: string
  createInstallState: CreateInstallState
  detail: string
  headline: string
  installPath: string
  loading: string
  logo: IntegrationLogo
  permissions: ToolPermissionController
  provider: Exclude<ToolProvider, "milo">
  status: ConnectionStatus
  tenantId: string
  title: string
}) {
  const install = useIntegrationInstall({
    connectError,
    createInstallState,
    installPath,
    tenantId,
  })
  const isConnected = status === "active"

  return (
    <Card className="md:col-span-2">
      <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-start gap-4">
          <IntegrationLogoMark logo={logo} />
          <div className="grid min-w-0 gap-2">
            <div className="grid gap-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <ConnectionLine headline={headline} status={status} />
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
        <CardAction className="static row-auto self-start justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end">
          <Button
            type="button"
            variant={isConnected ? "outline" : "default"}
            onClick={install.connect}
            disabled={install.isConnecting}
          >
            {install.isConnecting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {loading}
              </>
            ) : (
              <>
                {isConnected ? "Reconnect" : action}
                <ExternalLink />
              </>
            )}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ConnectionError error={install.error} />
        {isConnected ? (
          <div className="border-t pt-4">
            <IntegrationPermissions
              controller={permissions}
              provider={provider}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function IntegrationLogoMark({ logo }: { logo: IntegrationLogo }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-background">
      <img
        alt={logo.alt}
        className="size-7 object-contain"
        referrerPolicy="no-referrer"
        src={logo.src}
      />
    </div>
  )
}

function ConnectionLine({
  headline,
  status,
}: {
  headline: string
  status: ConnectionStatus
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", getStatusColorClassName(status))}
      />
      <span>{getStatusLabel(status, headline)}</span>
    </div>
  )
}

function getStatusLabel(status: ConnectionStatus, headline: string) {
  if (status === "active") {
    return `Connected to ${headline}`
  }

  if (status === undefined) {
    return headline
  }

  return `${headline} (${status})`
}

function getStatusColorClassName(status: ConnectionStatus) {
  if (status === "active") {
    return "bg-primary"
  }

  if (status === undefined) {
    return "bg-muted-foreground/40"
  }

  return "bg-warning"
}

function ConnectionError({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>Connection error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}
