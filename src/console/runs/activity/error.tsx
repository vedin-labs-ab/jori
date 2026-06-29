import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CodeBlockBody, CopyButton } from "../../shared/details"
import { activityToolFailureSummary } from "./tool-summary"

export function ActivityFailureDescription({
  error,
  title,
}: {
  error: string
  title: string
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="min-w-0 truncate text-muted-foreground">
        {activityToolFailureSummary(title)}
      </span>
      <ActivityErrorAction title={title} value={error} />
    </span>
  )
}

function ActivityErrorAction({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="h-5 px-1.5 text-destructive hover:text-destructive"
          size="xs"
          type="button"
          variant="ghost"
        >
          Show error
          <ChevronRight data-icon="inline-end" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Full error details from the failed tool call.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 overflow-hidden rounded-md bg-muted">
          <div className="flex min-w-0 items-center justify-between gap-2 border-b px-2.5 py-1.5 text-muted-foreground">
            <span className="min-w-0 truncate">Error details</span>
            <CopyButton label="error" value={value} />
          </div>
          <CodeBlockBody value={value} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
