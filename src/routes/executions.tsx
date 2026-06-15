import { createFileRoute } from "@tanstack/react-router"
import { Runs } from "@/console/runs"

export const Route = createFileRoute("/executions")({
  component: Runs,
})
