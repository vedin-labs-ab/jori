import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { IntegrationAccessFields } from "./access"
import { createScheduleDialogActions } from "./actions"
import { ScheduleDateTimePicker } from "./picker"
import { RecurringFields } from "./recurring"
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {schedule === undefined ? "New schedule" : "Edit schedule"}
          </DialogTitle>
          <DialogDescription>
            Milo runs the described work on schedule with the integration access
            you choose.
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
            <Label htmlFor="schedule-description">Instructions</Label>
            <Textarea
              id="schedule-description"
              value={values.description}
              onBlur={actions.normalizeDescription}
              onChange={(event) =>
                actions.updateDescription(event.target.value)
              }
              placeholder="Summarize shipped @GitHub changes and post the result to @Slack."
              rows={4}
            />
          </div>
          <IntegrationAccessFields
            onInsertSurface={actions.insertSurface}
            onReadScopeChange={actions.updateReadScope}
            onRemoveSurface={actions.removeSurface}
            onSurfaceAccessChange={actions.updateSurfaceAccess}
            values={values}
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
