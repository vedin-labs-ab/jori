import { createFileRoute } from "@tanstack/react-router"
import { TrustPage } from "@/landing/trust"

export const Route = createFileRoute("/trust")({
  component: TrustPage,
  head: () => ({
    meta: [{ title: "Trust · Milo" }],
  }),
})
