import { useMutation } from "convex/react"
import { Building2 } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
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
        <ConsoleEmptyState
          title="Couldn't prepare your workspace"
          description="You're signed in, but workspace setup didn't finish."
          icon={Building2}
          action={
            <Button onClick={retry} variant="outline">
              Try again
            </Button>
          }
        />
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
