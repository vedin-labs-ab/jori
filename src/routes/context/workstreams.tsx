import { createFileRoute } from "@tanstack/react-router"
import { ContextWorkstreams } from "@/console/context/workstreams"

export const Route = createFileRoute("/context/workstreams")({
  component: ContextWorkstreams,
})
