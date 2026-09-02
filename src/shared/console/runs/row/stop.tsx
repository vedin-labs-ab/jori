import { Loader2, Square } from "lucide-react"
import { useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { showErrorToast } from "../../error"

/** The row header's stop control: an icon button that asks before it
 *  stops the run. It sits against the header's right edge, so it carries
 *  its own margin. */
export function StopRunButton({
  className,
  onStop,
}: {
  className?: string
  /** Stops the run; a rejection is shown as the failure. */
  onStop: () => Promise<void>
}) {
  const { isOpen, isStopping, setOpen, stop } = useStopRun(onStop)

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (isStopping) {
          return
        }

        setOpen(open)
      }}
      open={isOpen}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Stop run"
              className={cn("mr-3 shrink-0", className)}
              disabled={isStopping}
              size="icon"
              type="button"
              variant="destructive"
            >
              <Square className="fill-current" />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Stop run</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop this run?</AlertDialogTitle>
          <AlertDialogDescription>
            Jori stops working immediately and the run can't resume. The trace
            so far is kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isStopping}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isStopping}
            onClick={(event) => {
              event.preventDefault()
              void stop()
            }}
            variant="destructive"
          >
            {isStopping ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Stop run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function useStopRun(onStop: () => Promise<void>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const isStoppingRef = useRef(false)

  const stop = async () => {
    if (isStoppingRef.current) {
      return
    }

    isStoppingRef.current = true
    setIsStopping(true)

    try {
      await onStop()
    } catch (caught) {
      showErrorToast(caught, "Couldn't stop the run.")
    } finally {
      isStoppingRef.current = false
      setIsStopping(false)
      setIsOpen(false)
    }
  }

  return { isOpen, isStopping, setOpen: setIsOpen, stop }
}
