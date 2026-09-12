import { createFileRoute } from "@tanstack/react-router"
import { TrustPage } from "@/landing/trust"

/** The root describes the home page, so a route that ships only a title
 *  inherits a description written about somewhere else. Both the search result
 *  and the share card read these, and this is the page a technical evaluator
 *  is sent to. */
const title = "AI access controls, approvals, and data regions · Jori"
const description =
  "Control what Jori can access, approve actions, and inspect every run. Choose EU or US workspace storage and see which services process data outside your region."

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
