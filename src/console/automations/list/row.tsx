import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
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
        <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 py-4 sm:px-5">
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
            <p className="line-clamp-2 max-w-[72ch] text-muted-foreground text-xs/relaxed">
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
        <CardContent className="mt-auto border-t p-0">
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
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md ring-1",
        isCompleted
          ? "bg-muted text-muted-foreground ring-foreground/10"
          : "bg-primary/10 text-primary ring-primary/20"
      )}
      role="img"
    >
      <Check className="size-4" />
    </span>
  )
}
