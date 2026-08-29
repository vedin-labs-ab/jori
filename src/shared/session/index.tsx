import {
  type AuthClient as ConvexAuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react"
import { Link, useNavigate } from "@tanstack/react-router"
import { type ComponentProps, type ReactNode } from "react"
import { AuthProvider } from "@/components/auth/auth-provider"
import { organizationPlugin } from "@/components/auth/lib/organization-plugin"
import { Toaster } from "@/components/ui/sonner"
import { authClient, authQueryClient } from "./auth"
import { convex } from "./client"

/** Better Auth and Convex for session-aware surfaces. Routes that can avoid
 *  resolving a session stay outside it. Sign-in is social-only, so the
 *  credential views never render. */
export function SessionProviders({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  return (
    <>
      {/* Pinned because the app is light-only. Keep this beside the provider
          so public pages do not load the notification runtime. */}
      <Toaster theme="light" />
      <AuthProvider
        Link={SessionLink}
        authClient={authClient}
        queryClient={authQueryClient}
        basePaths={{ auth: "" }}
        emailAndPassword={{ enabled: false }}
        localization={{ auth: { signIn: "Sign in" } }}
        navigate={({ to, replace }) => void navigate({ to, replace })}
        plugins={[organizationPlugin()]}
        redirectTo="/console"
        socialProviders={["google", "microsoft"]}
      >
        {/* The provider's AuthClient type only models its own convex plugin;
            the organization plugin widens useSession, so structurally ours is
            a superset. */}
        <ConvexBetterAuthProvider
          authClient={authClient as unknown as ConvexAuthClient}
          client={convex}
        >
          {children}
        </ConvexBetterAuthProvider>
      </AuthProvider>
    </>
  )
}

function SessionLink({
  href,
  children,
  ...props
}: { href: string; children?: ReactNode } & Omit<
  ComponentProps<typeof Link>,
  "to" | "href"
>) {
  return (
    <Link to={href} {...props}>
      {children}
    </Link>
  )
}
