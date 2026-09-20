import { createFileRoute } from "@tanstack/react-router"

// Where a new organization starts. The workspace's gate sees this route and
// onboards in place of the page, so there is nothing here to draw.
export const Route = createFileRoute("/_workspace/new")({
  component: () => null,
  head: () => ({ meta: [{ title: "New organization · Jori" }] }),
})
