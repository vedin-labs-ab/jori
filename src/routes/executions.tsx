import { createFileRoute } from "@tanstack/react-router"
import { Executions } from "@/console/executions"

export const Route = createFileRoute("/executions")({
  component: Executions,
})
