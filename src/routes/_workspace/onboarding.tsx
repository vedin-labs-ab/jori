import { createFileRoute, Navigate } from "@tanstack/react-router"
import { billingSearch } from "@/console/billing/actions/return"

// Where an organization is set up once it has a name, and where checkout
// comes back to. The workspace's gate onboards in place of the page, so the
// page is only ever drawn for an organization that is through, which has
// nothing left to do here.
export const Route = createFileRoute("/_workspace/onboarding")({
  validateSearch: billingSearch,
  component: () => <Navigate replace to="/chat" />,
  head: () => ({ meta: [{ title: "Set up · Jori" }] }),
})
