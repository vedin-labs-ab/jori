import { Cable, Layers, Library, type LucideIcon } from "lucide-react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleEmptyState } from "@/shared/console/list/empty"

const platformSurfaces: Record<
  string,
  { description: string; icon: LucideIcon; title: string }
> = {
  context: {
    description:
      "What Jori knows about the company: the profile and the websites.",
    icon: Layers,
    title: "Context is set in the console",
  },
  integrations: {
    description:
      "Slack, GitHub, Linear, and Notion, with per-tool permissions.",
    icon: Cable,
    title: "Integrations connect in the console",
  },
  skills: {
    description: "Write a skill once and load it from any job with a slash.",
    icon: Library,
    title: "Skills are written in the console",
  },
}

/** The platform group's pages, which set up things the demo has no
 *  connections for: they say so, under the crumb the console would show. */
export function PlatformPage({ surface }: { surface: string }) {
  const page = platformSurfaces[surface]

  if (page === undefined) {
    return null
  }

  return (
    <ConsolePageLayout>
      <ConsoleEmptyState
        description={page.description}
        icon={page.icon}
        title={page.title}
      />
    </ConsolePageLayout>
  )
}
