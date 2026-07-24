import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/landing/home"

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [{ title: "Milo · Hand over the work you repeat" }],
  }),
})
