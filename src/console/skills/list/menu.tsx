import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteSkillDialog } from "../delete"
import { type Skill } from "../types"

export function SkillManagementMenu({
  isPending,
  onDelete,
  onEdit,
  skill,
}: {
  isPending: boolean
  onDelete?: (skill: Skill) => void
  onEdit?: (skill: Skill) => void
  skill: Skill
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Manage ${skill.name}`}
            disabled={isPending}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            disabled={onEdit === undefined}
            onSelect={() => onEdit?.(skill)}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={onDelete === undefined}
            onSelect={() => setIsDeleteOpen(true)}
            variant="destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteSkillDialog
        isPending={isPending}
        onDelete={() => onDelete?.(skill)}
        skill={skill}
      />
    </AlertDialog>
  )
}
