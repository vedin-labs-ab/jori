import { createFileRoute, redirect } from "@tanstack/react-router"

// The console has no overview page; /console stays the entry path everything
// links and redirects to, and forwards to the first real surface.
export const Route = createFileRoute("/console")({
  beforeLoad: () => {
    throw redirect({ to: "/runs" })
  },
})
