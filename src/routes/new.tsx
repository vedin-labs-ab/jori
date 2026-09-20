import { createFileRoute } from "@tanstack/react-router"
import { ConsolePage } from "@/console/page"

// Where a new organization starts: the first step of onboarding. Creating
// it reloads into that organization, whose own onboarding takes over.
export const Route = createFileRoute("/new")({
  component: NewOrganizationPage,
  head: () => ({ meta: [{ title: "New organization · Jori" }] }),
})

function NewOrganizationPage() {
  return <ConsolePage creating>{() => null}</ConsolePage>
}
