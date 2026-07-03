import { SignInButton, UserButton, useAuth } from "@clerk/tanstack-react-start"
import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandIcon, BrandMark } from "@/shared/brand"

export function Landing() {
  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-6">
        <BrandMark />
        <HeaderActions />
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-12 md:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.72fr)] md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-medium tracking-normal text-balance sm:text-6xl lg:text-7xl">
            AI teammates for company work.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Milo watches the conversations that matter, gathers the right
            context, and helps teams move work forward from Slack.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/console">
                Open console
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-y py-8 md:border-y-0 md:border-l md:py-0 md:pl-10">
          <BrandIcon className="size-16" />
          <p className="max-w-sm text-2xl font-medium leading-snug">
            Set up an organization, connect Slack, and give Milo the skills it
            needs to help.
          </p>
          <p className="text-sm leading-6 text-muted-foreground">
            Setup takes a few minutes in the console.
          </p>
        </div>
      </section>
    </main>
  )
}

function HeaderActions() {
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <div className="ml-auto flex items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link to="/console">Console</Link>
      </Button>
      {!isLoaded ? (
        <Button disabled size="sm" variant="outline">
          Loading
        </Button>
      ) : null}
      {isLoaded && !isSignedIn ? (
        <SignInButton mode="modal">
          <Button size="sm">Sign in</Button>
        </SignInButton>
      ) : null}
      {isLoaded && isSignedIn ? <UserButton /> : null}
    </div>
  )
}
