import { createFileRoute } from "@tanstack/react-router"
import { ContextWorkstreams } from "@/console/context/workstreams"

export const Route = createFileRoute("/_workspace/context/workstreams")({
  component: ContextWorkstreams,
})
