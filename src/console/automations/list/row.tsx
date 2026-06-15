import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Automation } from "../types"
import { AutomationActions } from "./actions"
import { AutomationMeta } from "./meta"

export function AutomationRow({
  isDeleting,
  now,
  onDelete,
  onEdit,
  automation,
}: {
  isDeleting: boolean
  now: number
  onDelete: (automation: Automation) => void
  onEdit: (automation: Automation) => void
  automation: Automation
}) {
  return (
    <li className="min-w-0">
      <Card className="h-full gap-0 py-0 ring-inset transition-colors hover:bg-muted/20">
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:p-5">
          <AutomationStatusMark automation={automation} />
          <div className="grid min-w-0 gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate text-sm">
                {automation.name}
              </CardTitle>
              {automation.status === "completed" ? (
                <Badge className="shrink-0" variant="outline">
                  Completed
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-3 max-w-[72ch] text-muted-foreground text-xs/relaxed">
              {automation.instructions}
            </p>
          </div>
          <div className="col-start-3 row-start-1 self-start justify-self-end">
            <AutomationActions
              isDeleting={isDeleting}
              onDelete={onDelete}
              onEdit={onEdit}
              automation={automation}
            />
          </div>
        </CardHeader>
        <CardContent className="mt-auto border-t bg-muted/20 p-0">
          <AutomationMeta now={now} automation={automation} />
        </CardContent>
      </Card>
    </li>
  )
}

function AutomationStatusMark({ automation }: { automation: Automation }) {
  const isCompleted = automation.status === "completed"

  return (
    <span
      aria-label={isCompleted ? "Completed automation" : "Active automation"}
      className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted"
      role="img"
    >
      <Check className="size-6" />
    </span>
  )
}
