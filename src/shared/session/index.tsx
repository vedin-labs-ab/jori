import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start"
import { shadcn } from "@clerk/ui/themes"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import { type ReactNode } from "react"
import { convex } from "./client"

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
