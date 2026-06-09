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
import { LinearConnection } from "./linear"
import { MicrosoftConnection } from "./microsoft"
import { OrganizationCard } from "./organization"
import { SkillsCard } from "./skill/card"
import { SlackConnection } from "./slack"
import { useIntegrationCallbackStatus } from "./status"

export function Setup() {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth()
  const githubStatus = useIntegrationCallbackStatus("github")
  const linearStatus = useIntegrationCallbackStatus("linear")
  const microsoftStatus = useIntegrationCallbackStatus("microsoft")
  const slackStatus = useIntegrationCallbackStatus("slack")

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

      {slackStatus === "connected" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Slack connected</AlertTitle>
          <AlertDescription>
            Slack can now send Milo events for the active organization.
          </AlertDescription>
        </Alert>
      ) : null}

      {linearStatus === "connected" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Linear connected</AlertTitle>
          <AlertDescription>
            Linear can now send Milo issue and comment events for the active
            organization.
          </AlertDescription>
        </Alert>
      ) : null}

      {microsoftStatus === "connected" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Microsoft connected</AlertTitle>
          <AlertDescription>
            Microsoft 365 can now send Milo Teams message events for the active
            organization.
          </AlertDescription>
        </Alert>
      ) : null}

      {githubStatus === "connected" ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>GitHub connected</AlertTitle>
          <AlertDescription>
            GitHub can now send Milo comment events for the active organization.
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

      {linearStatus === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Linear connection failed</AlertTitle>
          <AlertDescription>
            Linear did not return an installation token. Check the Linear OAuth
            app settings and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {microsoftStatus === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>Microsoft connection failed</AlertTitle>
          <AlertDescription>
            Microsoft did not complete tenant consent and account OAuth. Check
            the Microsoft app permissions and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {githubStatus === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>GitHub connection failed</AlertTitle>
          <AlertDescription>
            GitHub did not return an installation. Check the GitHub App setup
            URL and try again.
          </AlertDescription>
        </Alert>
      ) : null}

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
      <MicrosoftConnection tenantId={organization.id} />
      <GitHubConnection tenantId={organization.id} />
      <SkillsCard tenantId={organization.id} />
    </section>
  )
}
