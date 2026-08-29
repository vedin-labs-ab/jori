import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Folder, Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  type FolderDialogRequest,
  FolderDialogs,
} from "@/console/folders/manage"
import { type FolderRow } from "@/console/folders/types"
import { ConsolePage } from "@/console/page"
import {
  ConsolePageLayout,
  ConsoleScrollableGrid,
} from "@/console/shared/layout"
import { ConsoleListSkeleton } from "@/console/shared/list/skeleton"
import { api } from "../../../convex/_generated/api"

/** The folder tree's landing page: the root folders as a plain list. The
 *  icon-collapsed sidebar links here — with the tree hidden, navigation
 *  continues in the main view. The component lives in the route file
 *  because src/console/folders is at the structure check's file cap. */
export function FoldersOverview() {
  return (
    <ConsolePage>
      {(organizationId) => <RootFolders organizationId={organizationId} />}
    </ConsolePage>
  )
}

export function RootFolders({ organizationId }: { organizationId: string }) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const roots =
    tree?.status === "ready"
      ? tree.folders.filter((folder) => folder.parentId === undefined)
      : undefined

  return (
    <ConsolePageLayout>
      <ConsoleScrollableGrid>
        {roots === undefined ? (
          <ConsoleListSkeleton />
        ) : roots.length === 0 ? (
          <EmptyFolders onCreate={() => setDialog({ type: "create" })} />
        ) : (
          <div className="divide-y rounded-md border">
            {roots.map((folder) => (
              <RootFolderRow folder={folder} key={folder.folderId} />
            ))}
          </div>
        )}
      </ConsoleScrollableGrid>
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        // Only the create dialog is reachable from this page, so a deletion
        // can never need navigation away.
        onDeleted={() => undefined}
        organizationId={organizationId}
      />
    </ConsolePageLayout>
  )
}

export function RootFolderRow({ folder }: { folder: FolderRow }) {
  return (
    <Link
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50"
      params={{ folderId: folder.folderId }}
      to="/folders/$folderId"
    >
      <Folder className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate font-medium">{folder.name}</span>
    </Link>
  )
}

export function EmptyFolders({ onCreate }: { onCreate: () => void }) {
  return (
    <Empty className="min-h-64">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Folder />
        </EmptyMedia>
        <EmptyTitle>No folders yet</EmptyTitle>
        <EmptyDescription>
          Folders organize the tables, stores, files, and automations your team
          shares.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate} type="button">
          <Plus />
          New folder
        </Button>
      </EmptyContent>
    </Empty>
  )
}
