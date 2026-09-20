import { useMutation } from "convex/react"
import { useEffect, useState } from "react"
import { localTimezone } from "@/shared/console/time"
import { api } from "../../../convex/_generated/api"

type Preparation = { organizationId: string; status: "ready" | "failed" }

/** Prepares the organization for this member. No console query may run
 *  until the member's person and identity links have been committed, so
 *  whatever reads the organization waits for `ready`.
 *
 *  The answer is kept per organization: another organization starts over,
 *  and one organization's late answer never opens the next. */
export function useOrganizationSession(organizationId: string | undefined) {
  const sync = useMutation(api.persons.account.sync)
  const [preparation, setPreparation] = useState<Preparation>()
  const status =
    preparation !== undefined && preparation.organizationId === organizationId
      ? preparation.status
      : "pending"

  useEffect(() => {
    if (status !== "pending" || organizationId === undefined) {
      return
    }

    let active = true
    const settle = (next: Preparation["status"]) => () => {
      if (active) {
        setPreparation({ organizationId, status: next })
      }
    }

    void sync({ organizationId, timezone: localTimezone() }).then(
      settle("ready"),
      settle("failed")
    )

    return () => {
      active = false
    }
  }, [sync, organizationId, status])

  return { status, retry: () => setPreparation(undefined) }
}
