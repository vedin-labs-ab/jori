import { createFileRoute } from "@tanstack/react-router"
import { Setup } from "@/setup"

export const Route = createFileRoute("/console")({ component: Setup })
