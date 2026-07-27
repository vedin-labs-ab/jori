import { createFileRoute } from "@tanstack/react-router"
import { TrustPage } from "@/landing/trust"

/** The root describes the home page, so a route that ships only a title
 *  inherits a description written about somewhere else. Both the search result
 *  and the share card read these, and this is the page a technical evaluator
 *  is sent to. */
const title = "Trust · Jori"
const description =
  "Every tool has a mode: allowed, ask first, or blocked. Approvals carry a code, every run keeps receipts, and unattended runs can never touch a gated tool."

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
})
