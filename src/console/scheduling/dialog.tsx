import { CircleHelp, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createScheduleDialogActions } from "./actions"
import { ScheduleInstructionsField } from "./instructions"
import { ScheduleDateTimePicker } from "./picker"
import { RecurringFields } from "./recurring"
import { type ScheduleReadScope } from "./surfaces"
import { type Schedule, type ScheduleFormValues } from "./types"

export function ScheduleDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  schedule,
  values,
}: {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: ScheduleFormValues) => void
  schedule: Schedule | undefined
  values: ScheduleFormValues
}) {
  const actions = createScheduleDialogActions({ onValuesChange, values })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {schedule === undefined ? "New schedule" : "Edit schedule"}
          </DialogTitle>
          <DialogDescription>
            Describe the work, choose what Milo can access, and set when it
            runs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={values.name}
              onChange={(event) => actions.updateName(event.target.value)}
              placeholder="Weekly release summary"
            />
          </div>
          <div className="grid gap-2">
            <div className="grid gap-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="schedule-description">Instructions</Label>
                <InstructionsHelp />
              </div>
              <p className="text-muted-foreground text-xs">
                Mention integrations to give Milo access. At least one needs
                write access.
              </p>
            </div>
            <ScheduleInstructionsField
              id="schedule-description"
              value={values.description}
              onBlur={actions.normalizeDescription}
              onValueChange={(next) =>
                actions.updateInstructions(next.description, next.surfaces)
              }
              placeholder="Summarize shipped GitHub changes and post the result to Slack."
              readScope={values.readScope}
              surfaces={values.surfaces}
            />
          </div>
          <AccessFields
            onReadScopeChange={actions.updateReadScope}
            onWebSearchChange={actions.updateWebSearch}
            readScope={values.readScope}
            webSearch={values.webSearch}
          />
          <ScheduleTiming onValuesChange={onValuesChange} values={values} />
        </div>

        {error === undefined ? null : (
          <Alert variant="destructive">
            <AlertTitle>Could not save schedule</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {schedule === undefined ? "Create schedule" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InstructionsHelp() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Instructions help"
            className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            type="button"
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="max-w-80 items-start text-left leading-relaxed"
          side="right"
        >
          <div className="grid gap-1">
            <p>
              Describe the work and mention integrations such as GitHub, Slack,
              Linear, Gmail, or Google Drive to give Milo access to them.
            </p>
            <p>
              Each mention controls what Milo can do there: read, write, or
              read/write. When all reads are allowed, mentions switch between
              read and read/write.
            </p>
            <p>
              Example: "Summarize GitHub changes and post the result to Slack."
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function AccessFields({
  onReadScopeChange,
  onWebSearchChange,
  readScope,
  webSearch,
}: {
  onReadScopeChange: (readScope: ScheduleReadScope) => void
  onWebSearchChange: (webSearch: boolean) => void
  readScope: ScheduleReadScope
  webSearch: boolean
}) {
  return (
    <div className="grid gap-2">
      <h3 className="font-medium text-xs">Access</h3>
      <div className="grid gap-2">
        <AccessCheckbox
          checked={readScope === "allConnected"}
          description="Milo can read from every connected integration, not just the ones you mention."
          id="schedule-all-reads"
          label="Allow reading from any connected integration"
          onCheckedChange={(checked) =>
            onReadScopeChange(checked ? "allConnected" : "selected")
          }
        />
        <AccessCheckbox
          checked={webSearch}
          description="Milo can search the web when the work needs it."
          id="schedule-web-search"
          label="Allow web search"
          onCheckedChange={onWebSearchChange}
        />
      </div>
    </div>
  )
}

function AccessCheckbox({
  checked,
  description,
  id,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  id: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="font-normal text-xs">
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  )
}

function ScheduleTiming({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  return (
    <Tabs
      value={values.type}
      onValueChange={(type) =>
        onValuesChange({ ...values, type: type as ScheduleFormValues["type"] })
      }
      className="gap-3"
    >
      <TabsList className="w-full">
        <TabsTrigger value="recurring">Recurring</TabsTrigger>
        <TabsTrigger value="oneShot">One-time</TabsTrigger>
      </TabsList>
      <TabsContent value="recurring">
        <RecurringFields onValuesChange={onValuesChange} values={values} />
      </TabsContent>
      <TabsContent value="oneShot" className="grid gap-2">
        <ScheduleDateTimePicker
          id="schedule-run-at"
          onValueChange={(runAt) => onValuesChange({ ...values, runAt })}
          value={values.runAt}
        />
        <p className="text-muted-foreground text-xs">
          Runs once at this time, in your local timezone.
        </p>
      </TabsContent>
    </Tabs>
  )
}
