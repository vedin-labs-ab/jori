import geistLatinWoff2 from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import { TanStackDevtools } from "@tanstack/react-devtools"
import {
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { AlertTriangle, SearchX } from "lucide-react"
import { lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  FullscreenLoadingProvider,
  FullscreenSkeletonLoader,
} from "@/shared/loading"
import { RootStateFrame } from "@/shared/state"
import appCss from "../styles.css?url"

const appTitle = "Milo"
const appDescription =
  "An AI teammate inside Slack, your email, and your calendar. Milo preps your day, drafts the follow-ups, works by your rules, and keeps receipts."
const providerlessRouteIds = new Set([
  "/",
  "/artifacts/$artifactId/",
  "/pricing",
  "/privacy",
  "/terms",
  "/trust",
])
const SessionProviders = lazy(() =>
  import("@/shared/session").then((module) => ({
    default: module.SessionProviders,
  }))
)

export const Route = createRootRoute({
  errorComponent: RootError,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: appTitle,
      },
      {
        name: "description",
        content: appDescription,
      },
      {
        property: "og:title",
        content: appTitle,
      },
      {
        property: "og:description",
        content: appDescription,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: appTitle,
      },
      {
        name: "twitter:description",
        content: appDescription,
      },
    ],
    links: [
      {
        rel: "preload",
        href: geistLatinWoff2,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/brand/favicon/favicon.ico",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/brand/favicon/favicon-32.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/brand/favicon/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootError({ error, reset }: { error: unknown; reset?: () => void }) {
  const message = readErrorMessage(error)

  return (
    <RootStateFrame
      action={
        <Button
          onClick={() => {
            reset?.()
            window.location.reload()
          }}
          type="button"
        >
          Reload
        </Button>
      }
      description="The app hit an unexpected state. Reload to reconnect your session and try again."
      icon={<AlertTriangle />}
      title="Milo couldn't load this page"
    >
      {import.meta.env.DEV ? (
        <code className="block max-w-full overflow-x-auto rounded-md bg-muted px-2.5 py-2 text-left font-mono text-muted-foreground text-xs">
          {message}
        </code>
      ) : null}
    </RootStateFrame>
  )
}

function NotFound() {
  return (
    <RootStateFrame
      action={
        <Button asChild variant="outline">
          <a href="/console">Go to console</a>
        </Button>
      }
      description="The link may be outdated, or the page may have moved."
      icon={<SearchX />}
      title="Page not found"
    />
  )
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message
  }

  return "Unknown application error."
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })
  const usesSessionProvider =
    routeId === undefined || !providerlessRouteIds.has(routeId)
  // Console routes need client session state before they can render. Auth
  // routes and public pages already send their complete first view from SSR.
  const waitsForClientSession =
    usesSessionProvider && !routeId?.startsWith("/auth/")
  const content = (
    <FullscreenLoadingProvider initiallyVisible={waitsForClientSession}>
      <TooltipProvider>{children}</TooltipProvider>
    </FullscreenLoadingProvider>
  )

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {usesSessionProvider ? (
          <Suspense fallback={<FullscreenSkeletonLoader />}>
            <SessionProviders>{content}</SessionProviders>
          </Suspense>
        ) : (
          content
        )}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
