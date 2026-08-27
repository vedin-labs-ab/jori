import { createFileRoute } from "@tanstack/react-router"
import { Landing } from "@/landing/home"

const title = "Jori · The AI teammate your whole company shares"
const description =
  "Hand Jori the work your team repeats, in Slack, GitHub, Linear, or email. It runs in the cloud, remembers as one teammate, and shows you everything it read, did, and cost."

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
