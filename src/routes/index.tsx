import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/landing/home"

const title = "Jori · The Monday pre-read, written for you"
const description =
  "Jori reads the week across your tools and keeps one live page your leadership team opens before the sync: what moved, what stalled, what shipped. Every line cited. Nothing typed in."

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
})
