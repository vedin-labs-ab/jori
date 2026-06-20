import { createFileRoute } from "@tanstack/react-router"
import { Runs } from "@/console/runs"

export const Route = createFileRoute("/runs")({
  component: Runs,
})
