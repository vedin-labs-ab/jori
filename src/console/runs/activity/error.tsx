import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CopyButton } from "../../shared/details"
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
      <DialogContent
        className="gap-0 overflow-hidden bg-muted p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Full error details from the failed tool call.
        </DialogDescription>
        <div className="grid min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center justify-end border-b px-3 py-2">
            <CopyButton label="error" value={value} />
          </div>
          <pre className="max-h-[70vh] min-w-0 overflow-auto px-3 py-2 font-mono text-foreground text-xs leading-relaxed">
            <code className="block whitespace-pre-wrap break-words">
              {value}
            </code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
