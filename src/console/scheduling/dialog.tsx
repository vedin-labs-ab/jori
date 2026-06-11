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
  function updateValue(
    name: Exclude<keyof ScheduleFormValues, "type">,
    value: string
  ) {
    onValuesChange({ ...values, [name]: value })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {schedule === undefined ? "New schedule" : "Edit schedule"}
          </DialogTitle>
          <DialogDescription>
            Milo runs the described work on schedule and posts the result to
            Slack.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="schedule-name">Name</Label>
            <Input
              id="schedule-name"
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              placeholder="Weekly release summary"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="schedule-description">Description</Label>
            <Textarea
              id="schedule-description"
              value={values.description}
              onChange={(event) =>
                updateValue("description", event.target.value)
              }
              placeholder="Summarize the changes shipped this week and call out anything risky."
              rows={3}
            />
          </div>
          <ScheduleTiming onValuesChange={onValuesChange} values={values} />
          <div className="grid gap-2">
            <Label htmlFor="schedule-channel">Slack channel ID</Label>
            <Input
              id="schedule-channel"
              value={values.channelId}
              onChange={(event) => updateValue("channelId", event.target.value)}
              placeholder="C0123456789"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="schedule-thread">Slack thread ID</Label>
            <Input
              id="schedule-thread"
              value={values.threadId}
              onChange={(event) => updateValue("threadId", event.target.value)}
              placeholder="1718000000.000100"
            />
            <p className="text-muted-foreground text-xs">
              Optional. Leave empty to post directly to the channel.
            </p>
          </div>
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
      <TabsContent value="recurring" className="grid gap-2">
        <Label htmlFor="schedule-cron">Cron expression</Label>
        <Input
          id="schedule-cron"
          className="font-mono"
          value={values.cron}
          onChange={(event) =>
            onValuesChange({ ...values, cron: event.target.value })
          }
          placeholder="0 9 * * 1-5"
        />
        <p className="text-muted-foreground text-xs">
          Five fields in UTC: minute, hour, day of month, month, day of week.
        </p>
      </TabsContent>
      <TabsContent value="oneShot" className="grid gap-2">
        <Label htmlFor="schedule-run-at">Run at</Label>
        <Input
          id="schedule-run-at"
          type="datetime-local"
          value={values.runAt}
          onChange={(event) =>
            onValuesChange({ ...values, runAt: event.target.value })
          }
        />
        <p className="text-muted-foreground text-xs">
          Runs once at this time, in your local timezone.
        </p>
      </TabsContent>
    </Tabs>
  )
}
