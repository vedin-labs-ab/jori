import { createFileRoute } from "@tanstack/react-router"
import { Playbooks } from "@/console/playbooks"

export const Route = createFileRoute("/playbooks")({ component: Playbooks })
