import { useMutation } from "convex/react"
import { type ReactNode, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { localTimezone } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"
import { PublicConsoleFrame } from "../shell/public"

/** Mount with the organization ID as its key. No console queries may run
 *  until this member's person and identity links have been committed. */
export function OrganizationSession({
  children,
  loader,
  organizationId,
}: {
  children: () => ReactNode
  loader: ReactNode
  organizationId: string
}) {
  const { retry, status } = useSessionInitialization(organizationId)

  if (status === "pending") {
    return loader
  }

  if (status === "failed") {
    return (
      <PublicConsoleFrame isSignedIn>
        <Alert variant="destructive">
          <AlertTitle>Couldn't prepare your workspace</AlertTitle>
          <AlertDescription>
            Your session is signed in, but workspace setup didn't finish.
            <Button onClick={retry} variant="outline">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </PublicConsoleFrame>
    )
  }

  return children()
}

function useSessionInitialization(organizationId: string) {
  const sync = useMutation(api.persons.account.sync)
  const [status, setStatus] = useState<"pending" | "ready" | "failed">(
    "pending"
  )

  useEffect(() => {
    if (status !== "pending") {
      return
    }

    let active = true

    void sync({ organizationId, timezone: localTimezone() }).then(
      () => active && setStatus("ready"),
      () => active && setStatus("failed")
    )

    return () => {
      active = false
    }
  }, [sync, organizationId, status])

  return {
    status,
    retry: () => setStatus("pending"),
  }
}
