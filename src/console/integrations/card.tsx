import { ExternalLink, Loader2 } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type CreateInstallState, useIntegrationInstall } from "./install"

export type ConnectionStatus = "active" | "paused" | "revoked" | undefined

export function IntegrationConnection({
  action,
  connectError,
  createInstallState,
  description,
  detail,
  headline,
  icon,
  installPath,
  loading,
  status,
  tenantId,
  title,
}: {
  action: string
  connectError: string
  createInstallState: CreateInstallState
  description: string
  detail: string
  headline: string
  icon: ReactNode
  installPath: string
  loading: string
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <ConnectionBadge status={status} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
          <div className="mt-0.5 text-muted-foreground">{icon}</div>
          <div className="grid gap-1">
            <div className="text-sm font-medium">{headline}</div>
            <div className="text-xs text-muted-foreground">{detail}</div>
          </div>
        </div>

        {install.error !== undefined ? (
          <Alert variant="destructive">
            <AlertTitle>Connection error</AlertTitle>
            <AlertDescription>{install.error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          onClick={install.connect}
          disabled={install.isConnecting}
          className="w-fit"
        >
          {install.isConnecting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {loading}
            </>
          ) : (
            <>
              {action}
              <ExternalLink />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === "active") {
    return <Badge>Connected</Badge>
  }

  if (status === undefined) {
    return <Badge variant="outline">Not connected</Badge>
  }

  return <Badge variant="secondary">{status}</Badge>
}
