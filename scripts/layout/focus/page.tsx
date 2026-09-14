import { DndContext } from "@dnd-kit/core"
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { useState } from "react"
import { createRoot } from "react-dom/client"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { EditingProvider } from "@/shared/console/edit/provider"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import { useFolderExpansion } from "@/shared/console/folders/expansion"
import { FolderTree } from "@/shared/console/folders/section"
import { type FolderRow } from "@/shared/console/folders/types"
import { ConsoleSidebar } from "@/shared/console/shell/navigation"
import "@/styles.css"

const params = new URLSearchParams(location.search)
const delay = (key: string) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, Number(params.get(key) ?? 0))
  )
function folder(id: string, name: string, parentId?: string): FolderRow {
  return {
    folderId: id as FolderRow["folderId"],
    name,
    parentId: parentId as FolderRow["parentId"],
    visibility: { mode: "organization" },
    createdBy: "owner" as FolderRow["createdBy"],
    createdAt: 0,
    updatedAt: 0,
  }
}
const initial = [
  folder("parent", "Engineering"),
  ...Array.from({ length: 30 }, (_, i) =>
    folder(`row-${i}`, `Folder ${String(i).padStart(2, "0")}`)
  ),
]

/** Real tree and menus; the service reply and live query arrive independently. */
export function Fixture() {
  const [folders, setFolders] = useState(initial)
  return (
    <EditingProvider
      name={() => "New folder"}
      onCreate={async (_, parentId) => {
        const row = folder(crypto.randomUUID(), "New folder", parentId)
        void delay("query").then(() =>
          setFolders((current) => [...current, row])
        )
        await delay("create")
        return { id: row.folderId, kind: "folder", name: row.name, parentId }
      }}
      onRename={async (item, name) => {
        setFolders((current) =>
          current.map((row) =>
            row.folderId === item.id ? { ...row, name } : row
          )
        )
      }}
    >
      <TooltipProvider>
        <DndContext>
          <SidebarProvider>
            <ConsoleSidebar
              account={<button type="button">Elsewhere</button>}
              chats={[]}
              folders={<Tree folders={folders} />}
              organization={null}
              pathname="/folders"
              platform={null}
            />
            <main className="p-4">
              <SidebarTrigger />
            </main>
          </SidebarProvider>
        </DndContext>
      </TooltipProvider>
    </EditingProvider>
  )
}
function Tree({ folders }: { folders: FolderRow[] }) {
  const expansion = useFolderExpansion(undefined, folders)
  const [, request] = useFolderRequests("sidebar")
  return (
    <FolderTree
      folders={folders}
      expansion={expansion}
      onCreate={() => {}}
      onDialog={request}
      onNewFolder={() => request({ type: "create" })}
      pathname="/folders"
    />
  )
}
const router = createRouter({
  history: createMemoryHistory({ initialEntries: ["/"] }),
  routeTree: createRootRoute({ component: Fixture }),
})
const root = document.getElementById("root")
if (root) {
  createRoot(root).render(<RouterProvider router={router} />)
}
