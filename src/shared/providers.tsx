import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import { useRouterState } from "@tanstack/react-router"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { type ReactNode } from "react"
import { convex } from "@/shared/convex"

/** Clerk and Convex for signed-in surfaces. Mounting this starts the
 *  clerk-js hotload, so surfaces that serve anonymous visitors (the artifact
 *  share viewer) must stay outside it. */
export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

/** The artifact viewer serves share-link visitors who have no session, so
 *  it stays outside the session stack and its member branch mounts
 *  SessionProviders itself. Every other route gets the stack here. */
export function RouteSessionProviders({ children }: { children: ReactNode }) {
  const isArtifactViewer = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) => match.routeId === "/artifacts/$artifactId/"
      ),
  })

  if (isArtifactViewer) {
    return children
  }

  return <SessionProviders>{children}</SessionProviders>
}
