import { createFileRoute } from "@tanstack/react-router"
import { Skills } from "@/console/skills"

export const Route = createFileRoute("/skills")({ component: Skills })
