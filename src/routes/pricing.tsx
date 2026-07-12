import { createFileRoute } from "@tanstack/react-router"
import { PricingPage } from "@/landing/pricing"

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [{ title: "Pricing · Milo" }],
  }),
})
