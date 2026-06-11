import { createFileRoute } from "@tanstack/react-router"
import { Scheduling } from "@/console/scheduling"

export const Route = createFileRoute("/scheduling")({
  component: Scheduling,
})
