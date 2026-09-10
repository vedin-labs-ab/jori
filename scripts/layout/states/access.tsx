import { ConvexProvider } from "convex/react"
import { getFunctionName } from "convex/server"
import { useEffect, useState } from "react"
import { OrganizationVisibilityDialog } from "@/console/shared/visibility/dialog"
import { demoId } from "@/landing/demo/fixtures/ids"
import { people, teams, viewerId } from "@/landing/demo/fixtures/people"
import { api } from "../../../convex/_generated/api"
import { delay, localService } from "./service"

/** The actual console binding, including permission/audience queries and save. */
export function AccessState({ state }: { state: string }) {
  const [service] = useState(localService)
  const [open, setOpen] = useState(true)
  useEffect(() => {
    let attempts = 0
    service.controls.mutate = async () => {
      const attempt = attempts++
      await delay()
      if (state === "access-error" && attempt === 0) {
        throw new Error("Simulated visibility service failure")
      }
    }
    const grantees = setTimeout(() => {
      service.publish(getFunctionName(api.visibility.console.grantees), {
        viewerId,
        people: people.map((person) => ({
          personId: person.id,
          name: person.name,
        })),
      })
      service.publish(
        getFunctionName(api.organization.teams.list),
        teams.map((team) => ({
          ...team,
          members: people.filter((person) => person.teamIds.includes(team.id)),
        }))
      )
    }, 1100)
    const audience = setTimeout(() => {
      service.publish(getFunctionName(api.visibility.console.audience), {
        people: people.map((person) => ({
          personId: person.id,
          name: person.name,
        })),
        memberCount: people.length,
        narrowedBy: "Customer renewals and regional account operations",
      })
    }, 1700)
    return () => {
      clearTimeout(grantees)
      clearTimeout(audience)
    }
  }, [service, state])

  return (
    <ConvexProvider client={service.client}>
      <OrganizationVisibilityDialog
        noun="table"
        onOpenChange={setOpen}
        open={open}
        organizationId="layout-isolated"
        ownerId={state === "access-owner" ? "another-owner" : undefined}
        target={{ kind: "table", id: demoId("collections", "layout-0") }}
        value={
          state === "access-people"
            ? { mode: "people", personIds: [viewerId] }
            : { mode: "organization" }
        }
      />
    </ConvexProvider>
  )
}
