import { createFileRoute } from "@tanstack/react-router"
import { Billing } from "@/console/billing"

export const Route = createFileRoute("/billing")({
  component: Billing,
})
