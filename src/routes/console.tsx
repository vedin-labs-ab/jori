import { createFileRoute, redirect } from "@tanstack/react-router"
import { billingSearch } from "@/console/billing/return"

// The console has no overview page; /console stays the entry path everything
// links and redirects to, and forwards to the place to ask.
export const Route = createFileRoute("/console")({
  validateSearch: billingSearch,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/chat",
      search: billingSearch(search),
      replace: true,
    })
  },
})
