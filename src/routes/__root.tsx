import geistLatinWoff2 from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import { TanStackDevtools } from "@tanstack/react-devtools"
import {
  createRootRoute,
  HeadContent,
  redirect,
  Scripts,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { AlertTriangle, SearchX } from "lucide-react"
import { lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Analytics } from "@/shared/analytics"
import { readErrorMessage } from "@/shared/console/error"
import {
  FullscreenLoadingProvider,
  FullscreenSkeletonLoader,
} from "@/shared/loading"
import { regionConfig } from "@/shared/region/config"
import { isMarketingPath, marketingUrl } from "@/shared/region/paths"
import { handleRegionRequest } from "@/shared/region/routing"
import { RootStateFrame } from "@/shared/state"
import appCss from "../styles.css?url"

const appTitle = "Jori"
/** Link previews fetch this from outside the app, so it cannot be a path. */
const appImage = new URL(
  "/brand/social/og-light.png",
  regionConfig.publicOrigin
).toString()
const appImageDescription =
  "Jori: The shared drive your AI works out of. A shared folder of renewal jobs, a customer table, and a store, beside a Slack thread confirming a new customer renewal."
/** Opens on the identity, because "shared drive" is the half of the
 *  sentence no other result claims: every competitor sells a per-seat
 *  assistant. The share image carries the same line, so a preview reads as
 *  one thought rather than as a picture with an unrelated caption. */
const appDescription =
  "Jori is the shared drive your AI works out of: jobs, tables, stores, and files in folders your teams share, with sharing and spend attached to every folder."
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
  { name: "color-scheme", content: "light" },
  { title: appTitle },
  { name: "description", content: appDescription },
  { property: "og:title", content: appTitle },
  { property: "og:description", content: appDescription },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: appTitle },
  { property: "og:image", content: appImage },
  { property: "og:image:type", content: "image/png" },
  // Declared so a preview reserves the right box before it has the file, and
  // so the card still says something when images are off.
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: appImageDescription },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: appImage },
  { name: "twitter:image:alt", content: appImageDescription },
  // Page titles and descriptions fall back to their Open Graph tags on X.
  // Root defaults here would override the more specific page metadata.
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
  {
    rel: "icon",
    href: "/favicon.ico",
    type: "image/x-icon",
    sizes: "16x16 32x32 48x48",
  },
  {
    rel: "icon",
    type: "image/png",
    sizes: "96x96",
    href: "/brand/favicon/favicon-96.png",
  },
  {
    rel: "icon",
    type: "image/svg+xml",
    sizes: "any",
    href: "/brand/favicon/favicon.svg",
  },
  {
    rel: "apple-touch-icon",
    sizes: "180x180",
    href: "/brand/favicon/apple-touch-icon.png",
  },
  { rel: "manifest", href: "/manifest.json" },
]

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") {
      return
    }
    const response = handleRegionRequest(
      new Request(new URL(location.href, window.location.origin)),
      regionConfig
    )
    const href = response?.headers.get("location")
    if (href) {
      throw redirect({ href, reloadDocument: true })
    }
  },
  errorComponent: RootError,
  head: ({ matches }) => {
    const path = matches.at(-1)?.pathname
    const notFound = matches.some(
      (match) => match.globalNotFound || match.status === "notFound"
    )
    const url =
      !notFound && path && isMarketingPath(path)
        ? marketingUrl(path)
        : undefined

    return {
      meta: url
        ? [...rootMeta, { property: "og:url", content: url }]
        : rootMeta,
      links: url ? [...rootLinks, { rel: "canonical", href: url }] : rootLinks,
    }
  },
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootError({ error, reset }: { error: unknown; reset?: () => void }) {
  const message = readErrorMessage(error, "Unknown application error.")

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
          <a href={marketingUrl()}>Back to Jori</a>
        </Button>
      }
      description="The link may be out of date, or the page may have moved."
      icon={<SearchX />}
      title="Page not found"
    />
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const routeId = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId,
  })
  const usesSessionProvider = routeId === undefined || !isMarketingPath(routeId)
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
