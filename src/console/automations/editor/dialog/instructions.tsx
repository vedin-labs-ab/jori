import { CircleHelp } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type AutomationPolicyPermissions } from "../../policy"
import { type AutomationFormValues } from "../../types"
import { AutomationInstructionsField } from "../instructions"
import { automationInstructionMarkerErrors } from "../payload/marker"

export function AutomationInstructionsSection({
  error,
  onBlur,
  onValueChange,
  permissions,
  policyKey,
  values,
}: {
  error: string | undefined
  onBlur: () => void
  onValueChange: (
    instructions: string,
    surfaces: AutomationFormValues["surfaces"]
  ) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  values: AutomationFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="automation-description">Instructions</Label>
        <InstructionsHelp />
      </div>
      <AutomationInstructionsField
        error={error}
        id="automation-description"
        value={values.instructions}
        onBlur={onBlur}
        onValueChange={(next) => onValueChange(next.description, next.surfaces)}
        permissions={permissions}
        placeholder="Summarize GitHub changes and post them to Slack."
        policyKey={policyKey}
        readScope={values.readScope}
        showAccessError={isAccessMarkerError(error)}
        surfaces={values.surfaces}
      />
    </div>
  )
}

function InstructionsHelp() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Instructions help"
            className="inline-flex size-3 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            type="button"
          >
            <CircleHelp className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          align="center"
          className="max-w-80 items-start text-left leading-relaxed"
          side="right"
        >
          <div className="grid gap-1">
            <p>Write the work Milo should do.</p>
            <p>Mention integrations like GitHub, Slack, Linear, or Gmail.</p>
            <p>Set access from each badge.</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function isAccessMarkerError(error: string | undefined) {
  return (
    error === automationInstructionMarkerErrors.incompleteAccess ||
    error === automationInstructionMarkerErrors.unavailableAccess
  )
}
