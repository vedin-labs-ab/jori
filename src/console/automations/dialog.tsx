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
import { NativeSelect } from "@/components/ui/native-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { createAutomationDialogActions } from "./actions"
import { AutomationInstructionsField } from "./instructions"
import { AutomationDateTimePicker } from "./picker"
import { RecurringFields } from "./recurring"
import {
  type AutomationReadScope,
  type AutomationSurfaceProvider,
  automationSurfaceProviders,
} from "./surfaces"
import { type Automation, type AutomationFormValues } from "./types"

export function AutomationDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  automation,
  values,
}: {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: AutomationFormValues) => void
  automation: Automation | undefined
  values: AutomationFormValues
}) {
  const actions = createAutomationDialogActions({ onValuesChange, values })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {automation === undefined ? "New automation" : "Edit automation"}
          </DialogTitle>
          <DialogDescription>
            Describe the work, choose what Milo can access, and set when it
            runs.
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
            <div className="grid gap-1">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="automation-description">Instructions</Label>
                <InstructionsHelp />
              </div>
              <p className="text-muted-foreground text-xs">
                Mention integrations to give Milo access. At least one needs
                write access.
              </p>
            </div>
            <AutomationInstructionsField
              id="automation-description"
              value={values.instructions}
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
          <AutomationTiming onValuesChange={onValuesChange} values={values} />
        </div>

        {error === undefined ? null : (
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
          description="Milo can read from every connected integration, not just the ones you mention."
          id="automation-all-reads"
          label="Allow reading from any connected integration"
          onCheckedChange={(checked) =>
            onReadScopeChange(checked ? "allConnected" : "selected")
          }
        />
        <AccessCheckbox
          checked={webSearch}
          description="Milo can search the web when the work needs it."
          id="automation-web-search"
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

function AutomationTiming({
  onValuesChange,
  values,
}: {
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
        <AutomationDateTimePicker
          id="automation-run-at"
          onValueChange={(runAt) => onValuesChange({ ...values, runAt })}
          value={values.runAt}
        />
        <p className="text-muted-foreground text-xs">
          Runs once at this time, in your local timezone.
        </p>
      </TabsContent>
      <TabsContent value="event">
        <EventFields onValuesChange={onValuesChange} values={values} />
      </TabsContent>
    </Tabs>
  )
}

function EventFields({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-2">
          <Label htmlFor="automation-event-provider">Provider</Label>
          <NativeSelect
            id="automation-event-provider"
            onChange={(event) =>
              onValuesChange({
                ...values,
                eventProvider: event.target.value as AutomationSurfaceProvider,
              })
            }
            value={values.eventProvider}
          >
            {automationSurfaceProviders.map((provider) => (
              <option key={provider.provider} value={provider.provider}>
                {provider.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="automation-event-name">Event</Label>
          <Input
            id="automation-event-name"
            onChange={(event) =>
              onValuesChange({ ...values, event: event.target.value })
            }
            placeholder="page.updated"
            value={values.event}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="automation-event-filter">Resource filter</Label>
        <Input
          id="automation-event-filter"
          onChange={(event) =>
            onValuesChange({ ...values, eventFilter: event.target.value })
          }
          placeholder="Optional page, thread, or message source ID"
          value={values.eventFilter}
        />
      </div>
    </div>
  )
}
