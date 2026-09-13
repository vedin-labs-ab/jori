import { plan } from "@contracts/billing"
import { createFileRoute } from "@tanstack/react-router"
import { PricingPage } from "@/landing/pricing"

const title = "Pricing for AI jobs and shared workspaces · Jori"
const description = `One price for the whole organization, never per seat. Cloud is $${plan.monthlyPriceUsd} a month with AI usage and file storage included. Self-hosted is free for internal use.`

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
})
