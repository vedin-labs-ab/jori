import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import geistLatinWoff2 from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { TooltipProvider } from "@/components/ui/tooltip"
import { convex } from "@/shared/convex"

import appCss from "../styles.css?url"

const appTitle = "Milo"
const appDescription = "AI teammates for company work."

export const Route = createRootRoute({
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
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <TooltipProvider>{children}</TooltipProvider>
          </ConvexProviderWithClerk>
        </ClerkProvider>
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
