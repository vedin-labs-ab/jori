import { Cable, Database, Layers, Library, type LucideIcon } from "lucide-react"
import { useMemo } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleEmptyState } from "@/shared/console/list/empty"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { fileKind } from "@/shared/files/kind"
import { folderOf, folderTrail } from "../derive/folders"
import { materialOf } from "../derive/materials"
import { useDemoWorkspace } from "../workspace"

// The pages the mock does not draw in full. A store's value editor and a
// file's viewer are the console's; here they say so, under the crumb the
// console would show. The platform surfaces do the same.

/** A store's or a file's page: the crumb and an honest line. */
export function MaterialPage({ materialId }: { materialId: string }) {
  const { state } = useDemoWorkspace()
  const material = materialOf(state, materialId)
  const folder =
    material?.folderId === undefined
      ? undefined
      : folderOf(state, material.folderId)

  useMaterialTrail(
    useMemo(
      () =>
        material === undefined
          ? undefined
          : {
              name: material.name,
              ...(folder === undefined
                ? {}
                : {
                    trail: folderTrail(state, folder).map((segment) => ({
                      name: segment.name,
                      params: { folderId: segment.folderId },
                      to: "/folders/$folderId",
                    })),
                  }),
            },
      [material, folder, state]
    )
  )

  if (material === undefined || material.kind === "table") {
    return null
  }

  return (
    <ConsolePageLayout>
      <ConsoleEmptyState
        description={
          material.kind === "store"
            ? "Open the console to edit this store."
            : "Open the console to view this file."
        }
        icon={
          material.kind === "store"
            ? Database
            : fileKind(material.mimeType, material.name).icon
        }
        title={material.name}
      />
    </ConsolePageLayout>
  )
}

const platformSurfaces: Record<
  string,
  { description: string; icon: LucideIcon; title: string }
> = {
  context: {
    description:
      "What Jori knows about the company: the profile, the websites, the workstreams.",
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
 *  connections for. */
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
