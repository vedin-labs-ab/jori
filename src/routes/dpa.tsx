import { createFileRoute } from "@tanstack/react-router"
import { DpaPage } from "@/landing/legal"

export const Route = createFileRoute("/dpa")({
  component: DpaPage,
  head: () => ({ meta: [{ title: "Data processing · Jori" }] }),
})
