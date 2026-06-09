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

export type ConnectionStatus = "active" | "paused" | "revoked" | undefined

export function IntegrationActionLabel({
  action,
  isConnecting,
  loading,
}: {
  action: string
  isConnecting: boolean
  loading: string
}) {
  if (isConnecting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" />
        {loading}
      </>
    )
  }

  return (
    <>
      {action}
      <ExternalLink />
    </>
  )
}

export function IntegrationConnectionCard({
  actionLabel,
  description,
  detail,
  error,
  headline,
  icon,
  isConnecting,
  onConnect,
  title,
  status,
}: {
  actionLabel: ReactNode
  description: string
  detail: string
  error: string | undefined
  headline: string
  icon: ReactNode
  isConnecting: boolean
  onConnect: () => void
  title: string
  status: ConnectionStatus
}) {
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

        {error !== undefined ? (
          <Alert variant="destructive">
            <AlertTitle>Connection error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="button"
          onClick={onConnect}
          disabled={isConnecting}
          className="w-fit"
        >
          {actionLabel}
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
