import { createFileRoute } from "@tanstack/react-router"
import { TermsPage } from "@/landing/legal"

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "Terms · Jori" }],
  }),
})
