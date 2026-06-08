import { useMutation, useQuery } from "convex/react"
import { ExternalLink, Loader2, MessageSquare } from "lucide-react"
import { useState } from "react"
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
import { api } from "../../convex/_generated/api"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function SlackConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(
    api.providers.slack.install.createInstallState
  )
  const status = useQuery(api.context.integrations.getSlackStatus, { tenantId })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string>()

  async function connectSlack() {
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
      const installUrl = new URL("/slack/install", convexSiteUrl)
      installUrl.searchParams.set("state", state)
      window.location.assign(installUrl.toString())
    } catch (installError) {
      setIsConnecting(false)
      setError(
        installError instanceof Error
          ? installError.message
          : "Could not start Slack install."
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slack</CardTitle>
        <CardDescription>
          Connect the Slack workspace that should trigger Milo.
        </CardDescription>
        <CardAction>
          <ConnectionBadge status={status?.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
          <MessageSquare className="mt-0.5 size-4 text-muted-foreground" />
          <div className="grid gap-1">
            <div className="text-sm font-medium">
              {status === undefined
                ? "Checking Slack"
                : (status?.teamName ??
                  status?.accountId ??
                  "No workspace connected")}
            </div>
            <div className="text-xs text-muted-foreground">
              {status?.status === "active"
                ? "Milo can receive signed Slack events, search context, and post thread replies as Milo."
                : "Install the Slack app once to enable context search and Milo replies."}
            </div>
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
          onClick={connectSlack}
          disabled={isConnecting}
          className="w-fit"
        >
          {isConnecting ? <Loader2 className="size-4 animate-spin" /> : null}
          Connect Slack
          <ExternalLink />
        </Button>
      </CardContent>
    </Card>
  )
}

function ConnectionBadge({
  status,
}: {
  status: "active" | "paused" | "revoked" | undefined
}) {
  if (status === "active") {
    return <Badge>Connected</Badge>
  }

  if (status === undefined) {
    return <Badge variant="outline">Not connected</Badge>
  }

  return <Badge variant="secondary">{status}</Badge>
}
