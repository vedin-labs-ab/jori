import {
  CreateOrganization,
  OrganizationSwitcher,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useOrganization,
} from "@clerk/tanstack-react-start"
import { useConvexAuth } from "convex/react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/shared/brand"
import { GitHubConnection } from "./github"
import { GmailConnection, GoogleCalendarConnection } from "./google"
import { LinearConnection } from "./linear"
import {
  MicrosoftCalendarConnection,
  MicrosoftEmailConnection,
} from "./microsoft"
import { OrganizationCard } from "./organization"
import { SkillsCard } from "./skill/card"
import { SlackConnection } from "./slack"
import { useIntegrationCallbackStatus } from "./status"

export function Setup() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()
  const gmailStatus = useIntegrationCallbackStatus("gmail")
  const githubStatus = useIntegrationCallbackStatus("github")
  const googleCalendarStatus = useIntegrationCallbackStatus("googleCalendar")
  const linearStatus = useIntegrationCallbackStatus("linear")
  const microsoftCalendarStatus =
    useIntegrationCallbackStatus("microsoftCalendar")
  const microsoftEmailStatus = useIntegrationCallbackStatus("microsoftEmail")
  const slackStatus = useIntegrationCallbackStatus("slack")
  const callbackStatuses = {
    gmail: gmailStatus,
    github: githubStatus,
    googleCalendar: googleCalendarStatus,
    linear: linearStatus,
    microsoftCalendar: microsoftCalendarStatus,
    microsoftEmail: microsoftEmailStatus,
    slack: slackStatus,
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <BrandMark />

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

      <IntegrationCallbackAlerts statuses={callbackStatuses} />

      {!isLoaded ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading
        </div>
      ) : null}

      <SetupContent
        isClerkLoaded={isLoaded}
        isConvexAuthenticated={isAuthenticated}
        isConvexAuthLoading={isConvexAuthLoading}
        isSignedIn={isSignedIn}
      />
    </main>
  )
}

const integrationCallbackAlerts = [
  {
    provider: "slack",
    status: "connected",
    title: "Slack connected",
    description: "Slack can now send Milo events for the active organization.",
  },
  {
    provider: "linear",
    status: "connected",
    title: "Linear connected",
    description:
      "Linear can now send Milo issue and comment events for the active organization.",
  },
  {
    provider: "microsoftEmail",
    status: "connected",
    title: "Microsoft Email connected",
    description:
      "Milo can now use Outlook mail tools for your account when explicitly requested.",
  },
  {
    provider: "microsoftCalendar",
    status: "connected",
    title: "Microsoft Calendar connected",
    description:
      "Milo can now use Microsoft Calendar tools for your account when explicitly requested.",
  },
  {
    provider: "github",
    status: "connected",
    title: "GitHub connected",
    description:
      "GitHub can now send Milo comment events for the active organization.",
  },
  {
    provider: "gmail",
    status: "connected",
    title: "Email connected",
    description:
      "Milo can now use Gmail tools for your account when explicitly requested.",
  },
  {
    provider: "googleCalendar",
    status: "connected",
    title: "Calendar connected",
    description:
      "Milo can now use Google Calendar tools for your account when explicitly requested.",
  },
  {
    provider: "slack",
    status: "error",
    title: "Slack connection failed",
    description:
      "Slack did not return an installation token. Check the Slack app OAuth settings and try again.",
  },
  {
    provider: "linear",
    status: "error",
    title: "Linear connection failed",
    description:
      "Linear did not return an installation token. Check the Linear OAuth app settings and try again.",
  },
  {
    provider: "microsoftEmail",
    status: "error",
    title: "Microsoft Email connection failed",
    description:
      "Microsoft did not return a usable Outlook mail OAuth token. Check the Microsoft app permissions and try again.",
  },
  {
    provider: "microsoftCalendar",
    status: "error",
    title: "Microsoft Calendar connection failed",
    description:
      "Microsoft did not return a usable Calendar OAuth token. Check the Microsoft app permissions and try again.",
  },
  {
    provider: "github",
    status: "error",
    title: "GitHub connection failed",
    description:
      "GitHub did not return an installation. Check the GitHub App setup URL and try again.",
  },
  {
    provider: "gmail",
    status: "error",
    title: "Email connection failed",
    description:
      "Google did not return a usable Gmail OAuth token. Check the Google OAuth app settings and try again.",
  },
  {
    provider: "googleCalendar",
    status: "error",
    title: "Calendar connection failed",
    description:
      "Google did not return a usable Calendar OAuth token. Check the Google OAuth app settings and try again.",
  },
] as const

function IntegrationCallbackAlerts({
  statuses,
}: {
  statuses: Record<
    (typeof integrationCallbackAlerts)[number]["provider"],
    "connected" | "error" | null
  >
}) {
  return integrationCallbackAlerts.map((alert) => {
    if (statuses[alert.provider] !== alert.status) {
      return null
    }

    return (
      <Alert
        key={`${alert.provider}-${alert.status}`}
        variant={alert.status === "error" ? "destructive" : undefined}
      >
        {alert.status === "connected" ? <CheckCircle2 /> : null}
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription>{alert.description}</AlertDescription>
      </Alert>
    )
  })
}

function SetupContent({
  isClerkLoaded,
  isConvexAuthenticated,
  isConvexAuthLoading,
  isSignedIn,
}: {
  isClerkLoaded: boolean
  isConvexAuthenticated: boolean
  isConvexAuthLoading: boolean
  isSignedIn: boolean | undefined
}) {
  if (!isClerkLoaded) {
    return null
  }

  if (!isSignedIn) {
    return <SignedOutView />
  }

  if (isConvexAuthLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading authentication
      </div>
    )
  }

  if (!isConvexAuthenticated) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Authentication unavailable</AlertTitle>
        <AlertDescription>
          Convex could not validate the active Clerk session.
        </AlertDescription>
      </Alert>
    )
  }

  return <SignedInView />
}

function SignedOutView() {
  return (
    <section className="grid max-w-xl gap-3">
      <h1 className="text-2xl font-medium tracking-normal">
        Bring Milo into your work.
      </h1>
      <p className="text-sm text-muted-foreground">
        Sign up, create an organization, connect a provider, and Milo can
        respond where work is happening.
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
      <LinearConnection tenantId={organization.id} />
      <GitHubConnection tenantId={organization.id} />
      <GmailConnection tenantId={organization.id} />
      <GoogleCalendarConnection tenantId={organization.id} />
      <MicrosoftEmailConnection tenantId={organization.id} />
      <MicrosoftCalendarConnection tenantId={organization.id} />
      <SkillsCard tenantId={organization.id} />
    </section>
  )
}
