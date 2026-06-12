import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { Square } from "lucide-react"
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
import { api } from "../../../convex/_generated/api"

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
  const stop = useMutation(api.executions.control.stop)

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              aria-label="Stop run"
              className={className}
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
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void stop({
                executionId: executionId as ExecutionId,
                tenantId,
              })
            }}
            variant="destructive"
          >
            Stop run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
