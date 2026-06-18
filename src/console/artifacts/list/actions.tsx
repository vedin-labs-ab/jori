import {
  Archive,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type ArtifactSummary } from "../types"
import { DeleteArtifactDialog } from "./delete"

export function ArtifactActions({
  artifact,
  isDeleting,
  isRestoring,
  onDelete,
  onRestore,
}: {
  artifact: ArtifactSummary
  isDeleting: boolean
  isRestoring: boolean
  onDelete: (artifact: ArtifactSummary) => void
  onRestore: (artifact: ArtifactSummary) => void
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const isArchived = artifact.archivedAt !== undefined
  const isPending = isDeleting || isRestoring
  const actionLabel = isArchived ? "Delete" : "Archive"
  const pendingLabel = isArchived ? "Deleting" : "Archiving"
  const ActionIcon = isArchived ? Trash2 : Archive

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${artifact.title}`}
            disabled={isPending}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MoreHorizontal />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {isArchived ? (
            <DropdownMenuItem
              disabled={isPending}
              onSelect={() => onRestore(artifact)}
            >
              {isRestoring ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RotateCcw />
              )}
              {isRestoring ? "Restoring" : "Restore"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={isPending}
            onSelect={() => setIsDeleteOpen(true)}
            variant={isArchived ? "destructive" : undefined}
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <ActionIcon />}
            {isDeleting ? pendingLabel : actionLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteArtifactDialog
        artifact={artifact}
        isDeleting={isDeleting}
        onDelete={() => onDelete(artifact)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </>
  )
}
