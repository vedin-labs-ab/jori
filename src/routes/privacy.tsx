import { createFileRoute } from "@tanstack/react-router"
import { PrivacyPage } from "@/landing/legal"

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [{ title: "Privacy · Jori" }],
  }),
})
