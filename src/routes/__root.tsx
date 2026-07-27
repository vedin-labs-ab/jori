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
import { Analytics } from "@/shared/analytics"
import {
  FullscreenLoadingProvider,
  FullscreenSkeletonLoader,
} from "@/shared/loading"
import { regionConfig } from "@/shared/region/config"
import { RootStateFrame } from "@/shared/state"
import appCss from "../styles.css?url"

const appTitle = "Jori"
/** Link previews fetch this from outside the app, so it cannot be a path. */
const appImage = new URL("/brand/og.jpg", regionConfig.publicOrigin).toString()
/** Opens on the transformation rather than the category, because "an AI
 *  teammate" is the half of the sentence every other result already claims.
 *  The share image carries the same line, so a preview reads as one thought
 *  rather than as a picture with an unrelated caption. */
const appDescription =
  "Work that lives in one head becomes a team app. Jori runs what your team repeats across Slack, GitHub, and Linear, and asks before it acts."
const providerlessRouteIds = new Set([
  "/",
  "/apps/$appId/",
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

/** Nothing here reads from the request, so the head is one value rather than
 *  a table rebuilt on every match. Routes that need their own title override
 *  it from their own `head`. */
const rootMeta: React.ComponentProps<"meta">[] = [
  { charSet: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  // The surface is white and light-only, so the browser chrome matches it
  // rather than falling back to the browser's own grey.
  { name: "theme-color", content: "#ffffff" },
  { title: appTitle },
  { name: "description", content: appDescription },
  { property: "og:title", content: appTitle },
  { property: "og:description", content: appDescription },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: appTitle },
  { property: "og:image", content: appImage },
  // Declared so a preview reserves the right box before it has the file, and
  // so the card still says something when images are off.
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: appTitle },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: appImage },
  { name: "twitter:title", content: appTitle },
  { name: "twitter:description", content: appDescription },
]
const rootLinks: React.ComponentProps<"link">[] = [
  {
    rel: "preload",
    href: geistLatinWoff2,
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "stylesheet", href: appCss },
  { rel: "icon", href: "/brand/favicon/favicon.ico" },
  {
    rel: "icon",
    type: "image/png",
    sizes: "32x32",
    href: "/brand/favicon/favicon-32.png",
  },
  { rel: "apple-touch-icon", href: "/brand/favicon/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.json" },
]

export const Route = createRootRoute({
  errorComponent: RootError,
  head: () => ({ meta: rootMeta, links: rootLinks }),
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
      description="Something went wrong loading this page. A reload usually clears it."
      icon={<AlertTriangle />}
      title="Jori couldn't load this page"
    >
      {import.meta.env.DEV ? (
        <code className="block w-full overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 text-left font-mono text-muted-foreground text-xs">
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
        // A plain anchor, not a router link: the console and the marketing
        // site share this boundary, and home resolves correctly for both.
        <Button asChild variant="outline">
          <a href="/">Back to Jori</a>
        </Button>
      }
      description="The link may be out of date, or the page may have moved."
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
  // Console routes need client session state before they can render. Sign-in
  // and public pages already send their complete first view from SSR.
  const waitsForClientSession = usesSessionProvider && routeId !== "/sign-in"
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
        <Analytics>
          {usesSessionProvider ? (
            <Suspense fallback={<FullscreenSkeletonLoader />}>
              <SessionProviders>{content}</SessionProviders>
            </Suspense>
          ) : (
            content
          )}
        </Analytics>
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
