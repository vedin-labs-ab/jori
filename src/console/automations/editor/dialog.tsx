import { CircleHelp, Loader2 } from "lucide-react"
import { lazy, Suspense } from "react"
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
import { type AutomationReadScope } from "../surfaces"
import { type Automation, type AutomationFormValues } from "../types"
import { createAutomationDialogActions } from "./actions"
import { AutomationInstructionsField } from "./instructions"
import {
  automationInstructionMarkerErrors,
  readAutomationInstructionMarkerError,
} from "./payload/marker"
import { RecurringFields } from "./recurring"

const AutomationDateTimePicker = lazy(async () => ({
  default: (await import("./picker")).AutomationDateTimePicker,
}))

const EventFields = lazy(async () => ({
  default: (await import("./event")).EventFields,
}))

export function AutomationDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  automation,
  tenantId,
  values,
}: {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: AutomationFormValues) => void
  automation: Automation | undefined
  tenantId: string
  values: AutomationFormValues
}) {
  const actions = createAutomationDialogActions({ onValuesChange, values })
  const instructionsError = readAutomationInstructionMarkerError(error)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSaving) {
          return
        }

        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {automation === undefined ? "New automation" : "Edit automation"}
          </DialogTitle>
          <DialogDescription>
            Tell Milo what to do, what it can access, and when to run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              value={values.name}
              onChange={(event) => actions.updateName(event.target.value)}
              placeholder="Weekly release summary"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="automation-description">Instructions</Label>
              <InstructionsHelp />
            </div>
            <AutomationInstructionsField
              error={instructionsError}
              id="automation-description"
              value={values.instructions}
              onBlur={actions.normalizeDescription}
              onValueChange={(next) =>
                actions.updateInstructions(next.description, next.surfaces)
              }
              placeholder="Summarize GitHub changes and post them to Slack."
              readScope={values.readScope}
              showAccessError={
                instructionsError ===
                automationInstructionMarkerErrors.incompleteAccess
              }
              surfaces={values.surfaces}
            />
          </div>
          <AccessFields
            onReadScopeChange={actions.updateReadScope}
            onWebSearchChange={actions.updateWebSearch}
            readScope={values.readScope}
            webSearch={values.webSearch}
          />
          <AutomationTiming
            tenantId={tenantId}
            onValuesChange={onValuesChange}
            values={values}
          />
        </div>

        {error === undefined || instructionsError !== undefined ? null : (
          <Alert variant="destructive">
            <AlertTitle>Could not save automation</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {automation === undefined ? "Create automation" : "Save changes"}
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
            <p>Write the work Milo should do.</p>
            <p>Mention integrations like GitHub, Slack, Linear, or Gmail.</p>
            <p>Set access from each badge.</p>
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
  onReadScopeChange: (readScope: AutomationReadScope) => void
  onWebSearchChange: (webSearch: boolean) => void
  readScope: AutomationReadScope
  webSearch: boolean
}) {
  return (
    <div className="grid gap-2">
      <h3 className="font-medium text-xs">Access</h3>
      <div className="grid gap-2">
        <AccessCheckbox
          checked={readScope === "allConnected"}
          description="For context from integrations you do not mention."
          id="automation-all-reads"
          label="Let Milo read any connected integration"
          onCheckedChange={(checked) =>
            onReadScopeChange(checked ? "allConnected" : "selected")
          }
        />
        <AccessCheckbox
          checked={webSearch}
          description="For current public information."
          id="automation-web-search"
          label="Let Milo search the web"
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

function AutomationTiming({
  tenantId,
  onValuesChange,
  values,
}: {
  tenantId: string
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  return (
    <Tabs
      value={values.type}
      onValueChange={(type) =>
        onValuesChange({
          ...values,
          type: type as AutomationFormValues["type"],
        })
      }
      className="gap-3"
    >
      <TabsList className="w-full">
        <TabsTrigger value="cron">Recurring</TabsTrigger>
        <TabsTrigger value="once">One-time</TabsTrigger>
        <TabsTrigger value="event">Event</TabsTrigger>
      </TabsList>
      <TabsContent value="cron">
        <RecurringFields onValuesChange={onValuesChange} values={values} />
      </TabsContent>
      <TabsContent value="once" className="grid gap-2">
        <Suspense fallback={<TimingFallback />}>
          <AutomationDateTimePicker
            id="automation-run-at"
            onValueChange={(runAt) => onValuesChange({ ...values, runAt })}
            value={values.runAt}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="event">
        <Suspense fallback={<TimingFallback />}>
          <EventFields
            tenantId={tenantId}
            onValuesChange={onValuesChange}
            values={values}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}

function TimingFallback() {
  return (
    <div aria-hidden="true" className="h-16 rounded-md border bg-muted/30" />
  )
}
