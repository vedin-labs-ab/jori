import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Automation } from "../types"
import { DeleteAutomationDialog } from "./delete"

export function AutomationActions({
  isDeleting,
  onDelete,
  onEdit,
  automation,
}: {
  isDeleting: boolean
  onDelete: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  automation: Automation
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open actions for ${automation.name}`}
            size="icon"
            type="button"
            variant="ghost"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => onEdit(automation)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isDeleting}
            onSelect={() => setIsDeleteOpen(true)}
            variant="destructive"
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {isDeleting ? "Deleting" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteAutomationDialog
        isDeleting={isDeleting}
        onDelete={() => onDelete(automation)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
        automation={automation}
      />
    </>
  )
}
