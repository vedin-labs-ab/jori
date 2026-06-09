import { createFileRoute } from "@tanstack/react-router"
import { Console } from "@/console"

export const Route = createFileRoute("/console")({ component: Console })
