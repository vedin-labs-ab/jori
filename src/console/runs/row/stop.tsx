import { useMutation } from "convex/react"
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
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../convex/_generated/api"
import { type ExecutionItem } from "../types"

export function StopExecution({
  className,
  runId,
  organizationId,
}: {
  className?: string
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const { isOpen, isStopping, setOpen, stopExecution } = useStopExecution({
    runId,
    organizationId,
  })

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
              className={className}
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
              void stopExecution()
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

function useStopExecution({
  runId,
  organizationId,
}: {
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const stop = useMutation(api.runs.control.stop)
  const [isOpen, setIsOpen] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const isStoppingRef = useRef(false)

  const stopExecution = async () => {
    if (isStoppingRef.current) {
      return
    }

    isStoppingRef.current = true
    setIsStopping(true)

    try {
      await stop({
        runId,
        organizationId,
      })
    } catch (caught) {
      showErrorToast(caught, "Couldn't stop the run.")
    } finally {
      isStoppingRef.current = false
      setIsStopping(false)
      setIsOpen(false)
    }
  }

  return { isOpen, isStopping, setOpen: setIsOpen, stopExecution }
}
