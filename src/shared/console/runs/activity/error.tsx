import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { CopyButton } from "../../copy"
import { activityToolFailureSummary } from "./tool/summary"

export function ActivityFailureDescription({
  error,
  title,
}: {
  error: string
  title: string
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2 overflow-hidden whitespace-nowrap">
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
          className="shrink-0 text-destructive hover:text-destructive"
          size="xs"
          type="button"
          variant="ghost"
        >
          Show error
          <ChevronRight data-icon="inline-end" />
        </Button>
      </DialogTrigger>
      <DialogContent
        // Full-bleed: the copy-row divider spans the card, the pre scrolls.
        bodyClassName="gap-0 p-0"
        className="bg-muted sm:max-w-3xl"
        // Autofocusing the copy button pops its tooltip, whose layer then
        // swallows Escape before the dialog can see it.
        onOpenAutoFocus={(event) => event.preventDefault()}
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
          <pre
            className={cn(
              scrollFade,
              "max-h-[70vh] min-w-0 overflow-auto px-3 py-2 font-mono text-foreground text-xs leading-relaxed"
            )}
          >
            <code className="block whitespace-pre-wrap break-words">
              {value}
            </code>
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}
