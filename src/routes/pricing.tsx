import { createFileRoute } from "@tanstack/react-router"
import { PricingPage } from "@/landing/pricing"

const title = "Pricing for AI jobs and shared workspaces · Jori"
const description =
  "One price for the whole organization, not per seat. Model work is billed at the provider's list rates and drawn from prepaid credit, so no invoice arrives."

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
