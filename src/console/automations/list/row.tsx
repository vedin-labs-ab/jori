import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { VisibilityBadge } from "../../shared/visibility/badge"
import { type Automation } from "../types"
import { AutomationRowMenu } from "./actions"
import { DeleteAutomationDialog } from "./delete"
import { AutomationStatusMark } from "./mark"
import { AutomationMeta } from "./meta"

export function AutomationRow({
  isControlling,
  isDeleting,
  now,
  onDelete,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  automation,
}: {
  isControlling: boolean
  isDeleting: boolean
  now: number
  onDelete: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  onMoveToFolder: (automation: Automation) => void
  onPausedChange: (automation: Automation, paused: boolean) => void
  automation: Automation
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const requestDelete = () => setIsDeleteOpen(true)

  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0 ring-inset transition-colors hover:bg-muted/20">
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 sm:p-5">
          <AutomationStatusMark
            isControlling={isControlling}
            isDeleting={isDeleting}
            onDeleteRequest={requestDelete}
            onPausedChange={onPausedChange}
            automation={automation}
          />
          <div className="grid min-w-0 content-start gap-1.5">
            <div className="grid min-h-6 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate font-heading text-sm font-medium">
                  {automation.name}
                </h3>
                {automation.visibility.mode === "organization" ? null : (
                  <VisibilityBadge visibility={automation.visibility} />
                )}
                {shouldShowCompletedBadge(automation) ? (
                  <Badge className="shrink-0" variant="outline">
                    Completed
                  </Badge>
                ) : automation.status === "paused" ? (
                  <Badge className="shrink-0" variant="secondary">
                    Paused
                  </Badge>
                ) : null}
              </div>
              <AutomationRowMenu
                isControlling={isControlling}
                isDeleting={isDeleting}
                onDeleteRequest={requestDelete}
                onEdit={onEdit}
                onMoveToFolder={onMoveToFolder}
                onPausedChange={onPausedChange}
                automation={automation}
              />
            </div>
            <p className="line-clamp-3 max-w-[72ch] text-muted-foreground text-xs/relaxed">
              {automation.instructions}
            </p>
          </div>
        </div>
        <CardContent className="mt-auto border-t bg-muted/20 p-0">
          <AutomationMeta now={now} automation={automation} />
        </CardContent>
      </Card>
      <DeleteAutomationDialog
        isDeleting={isDeleting}
        onDelete={() => onDelete(automation)}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
        automation={automation}
      />
    </li>
  )
}

function shouldShowCompletedBadge(automation: Automation) {
  return automation.status === "completed" && automation.type !== "once"
}
