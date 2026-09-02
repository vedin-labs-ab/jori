import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/landing/home"

const title = "Jori · The shared drive your AI works out of"
const description =
  "Jori files AI jobs next to the tables and files they keep current, in folders your teams share. Who can see a folder, and what it costs to run, come with it. Ask from Slack, GitHub, or Linear."

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
