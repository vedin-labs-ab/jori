import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import { useRouterState } from "@tanstack/react-router"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { type ReactNode } from "react"
import { convex } from "@/shared/convex"

/** Clerk and Convex for session-aware surfaces. Mounting this starts the
 *  clerk-js hotload, so routes that can avoid resolving a session stay
 *  outside it. */
export function SessionProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

/** The artifact route resolves member access before falling back to a share
 *  grant, so it owns the session stack. Every other route gets it here. */
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
