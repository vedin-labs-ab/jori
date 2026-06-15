import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
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
import { api } from "../../../../convex/_generated/api"

type ExecutionId = FunctionArgs<
  typeof api.executions.control.stop
>["executionId"]

export function StopExecution({
  className,
  executionId,
  tenantId,
}: {
  className?: string
  executionId: string
  tenantId: string
}) {
  const { error, isOpen, isStopping, setOpen, stopExecution } =
    useStopExecution({ executionId, tenantId })

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
            Milo stops working immediately and the run can't resume. The trace
            so far is kept.
          </AlertDialogDescription>
          {error === undefined ? null : (
            <p className="text-destructive text-xs/relaxed" role="alert">
              {error}
            </p>
          )}
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
  executionId,
  tenantId,
}: {
  executionId: string
  tenantId: string
}) {
  const stop = useMutation(api.executions.control.stop)
  const [isOpen, setIsOpen] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [error, setError] = useState<string>()
  const isStoppingRef = useRef(false)

  const setOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setError(undefined)
    }
  }

  const stopExecution = async () => {
    if (isStoppingRef.current) {
      return
    }

    isStoppingRef.current = true
    setError(undefined)
    setIsStopping(true)

    try {
      await stop({
        executionId: executionId as ExecutionId,
        tenantId,
      })
      setIsOpen(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The run could not be stopped."
      )
    } finally {
      isStoppingRef.current = false
      setIsStopping(false)
    }
  }

  return { error, isOpen, isStopping, setOpen, stopExecution }
}
