import { availableName } from "@contracts/text"
import { type ReactNode } from "react"
import { EditingProvider } from "@/shared/console/edit/provider"
import { useConsoleNavigate } from "@/shared/console/shell/location"
import { storeSummary, tableSummary } from "./derive/materials"
import { type FolderId } from "./fixtures/types"
import { useDemoWorkspace } from "./workspace"

export function DemoEditing({ children }: { children: ReactNode }) {
  const { state, actions } = useDemoWorkspace()
  const navigate = useConsoleNavigate()
  const name = (kind: "folder" | "table" | "store", parentId?: string) =>
    availableName(
      `New ${kind}`,
      kind === "folder"
        ? state.folders
            .filter((f) => f.parentId === parentId)
            .map((f) => f.name)
        : state.materials
            .filter((m) => m.kind === kind && m.folderId === parentId)
            .map((m) => m.name)
    )
  return (
    <EditingProvider
      name={name}
      onReveal={(_kind, folderId) =>
        navigate(
          folderId === undefined
            ? { to: "/folders" }
            : { to: "/folders/$folderId", params: { folderId } }
        )
      }
      onCreate={async (kind, parentId) => {
        const label = name(kind, parentId)
        if (kind === "folder") {
          const id = actions.createFolder(
            label,
            parentId as FolderId | undefined
          )
          return { id, kind, name: label, parentId }
        }
        const material = actions.createMaterial(kind, {
          name: label,
          folderId: parentId,
          visibility: { mode: "organization" },
        })
        return {
          id: material.id,
          kind,
          name: label,
          parentId,
          table: material.kind === "table" ? tableSummary(material) : undefined,
          store: material.kind === "store" ? storeSummary(material) : undefined,
        }
      }}
      onRename={async (item, name) =>
        item.kind === "folder"
          ? actions.renameFolder(item.id as FolderId, name)
          : actions.updateMaterial(item.id, { name })
      }
    >
      {children}
    </EditingProvider>
  )
}
