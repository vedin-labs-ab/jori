import {
  CreateOrganization,
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquare,
} from "lucide-react"
import { useEffect, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../convex/_generated/api"

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL

export function Milo() {
  const { isLoaded, isSignedIn } = useAuth()
  const slackStatus = getSlackCallbackStatus()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/brand/mark/mark-black.svg"
            alt=""
            className="block size-8 dark:hidden"
          />
          <img
            src="/brand/mark/mark-white.svg"
            alt=""
            className="hidden size-8 dark:block"
          />
          <span className="text-base font-medium">Milo</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!isLoaded ? (
            <Button variant="outline" size="sm" disabled>
              Loading
            </Button>
          ) : null}
          {isLoaded && !isSignedIn ? (
            <>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </>
          ) : null}
          {isLoaded && isSignedIn ? (
            <>
              <OrganizationSwitcher />
              <UserButton />
            </>
          ) : null}
        </div>
      </header>

      {slackStatus === "connected" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Slack connected</AlertTitle>
          <AlertDescription>
            Slack can now send Milo events for the active organization.
          </AlertDescription>
        </Alert>
      ) : null}

      {slackStatus === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Slack connection failed</AlertTitle>
          <AlertDescription>
            Slack did not return an installation token. Check the Slack app
            OAuth settings and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoaded ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading
        </div>
      ) : null}

      {isLoaded && !isSignedIn ? <SignedOutView /> : null}

      {isLoaded && isSignedIn ? <SignedInView /> : null}
    </main>
  )
}

function SignedOutView() {
  return (
    <section className="grid max-w-xl gap-3">
      <h1 className="text-2xl font-medium tracking-normal">
        Bring Milo into Slack.
      </h1>
      <p className="text-sm text-muted-foreground">
        Sign up, create an organization, connect Slack, and Milo can respond to
        relevant Slack messages.
      </p>
      <div className="flex flex-wrap gap-2">
        <SignUpButton mode="modal">
          <Button>Get started</Button>
        </SignUpButton>
        <SignInButton mode="modal">
          <Button variant="outline">Sign in</Button>
        </SignInButton>
      </div>
    </section>
  )
}

function SignedInView() {
  const { isLoaded, organization } = useOrganization()

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading organization
      </div>
    )
  }

  if (organization === undefined || organization === null) {
    return (
      <section className="grid max-w-xl gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-medium tracking-normal">
            Create your organization.
          </h1>
          <p className="text-sm text-muted-foreground">
            Milo uses Clerk organizations as tenants.
          </p>
        </div>
        <CreateOrganization />
      </section>
    )
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <OrganizationCard organization={organization} />
      <SlackConnection tenantId={organization.id} />
    </section>
  )
}

function OrganizationCard({
  organization,
}: {
  organization: NonNullable<ReturnType<typeof useOrganization>["organization"]>
}) {
  const [website, setWebsite] = useState(
    readWebsite(organization.publicMetadata)
  )
  const updateOrganizationWebsite = useAction(
    api.onboarding.updateOrganizationWebsite
  )
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  )

  useEffect(() => {
    setWebsite(readWebsite(organization.publicMetadata))
    setSaveStatus("idle")
  }, [organization.publicMetadata])

  async function saveWebsite() {
    setSaveStatus("saving")
    await updateOrganizationWebsite({
      tenantId: organization.id,
      website: website.trim(),
    })
    setSaveStatus("saved")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization</CardTitle>
        <CardDescription>
          Clerk owns identity and organization setup.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1">
          <div className="text-sm font-medium">{organization.name}</div>
          <div className="text-xs text-muted-foreground">{organization.id}</div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="website">Website</Label>
          <div className="flex gap-2">
            <Input
              id="website"
              value={website}
              onChange={(event) => {
                setWebsite(event.target.value)
                setSaveStatus("idle")
              }}
              placeholder="https://company.com"
              type="url"
            />
            <Button
              type="button"
              variant="outline"
              onClick={saveWebsite}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {saveStatus === "saved" ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SlackConnection({ tenantId }: { tenantId: string }) {
  const createInstallState = useMutation(api.slack.createInstallState)
  const status = useQuery(api.integrations.getSlackStatus, { tenantId })
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
                ? "Milo can receive signed Slack events and post thread replies."
                : "Install the Slack app to enable the V1 runtime loop."}
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

function readWebsite(metadata: unknown) {
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "website" in metadata &&
    typeof metadata.website === "string"
  ) {
    return metadata.website
  }

  return ""
}

function getSlackCallbackStatus() {
  if (typeof window === "undefined") {
    return null
  }

  const value = new URLSearchParams(window.location.search).get("slack")

  if (value === "connected" || value === "error") {
    return value
  }

  return null
}
