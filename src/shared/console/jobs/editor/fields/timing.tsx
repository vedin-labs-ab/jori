import { lazy, type ReactNode, Suspense } from "react"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { localTimezone } from "@/shared/console/time"
import { type JobFormValues } from "../../types"
import { RecurringFields } from "../schedule/recurring"

const JobDateTimePicker = lazy(async () => ({
  default: (await import("../schedule/picker")).JobDateTimePicker,
}))

export function JobTiming({
  eventFields,
  showRunPreview,
  onValuesChange,
  values,
}: {
  /** The Event tab's fields, bound by the host: which integrations are
   *  connected and what they offer is its to know. */
  eventFields: ReactNode
  showRunPreview: boolean
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
}) {
  return (
    <div className="grid gap-2">
      {/* The word the job's page and the jobs list already use for it. */}
      <Label id="job-trigger-label">Trigger</Label>
      <JobTimingTabs
        eventFields={eventFields}
        onValuesChange={onValuesChange}
        showRunPreview={showRunPreview}
        values={values}
      />
    </div>
  )
}

function JobTimingTabs({
  eventFields,
  showRunPreview,
  onValuesChange,
  values,
}: Parameters<typeof JobTiming>[0]) {
  return (
    <Tabs
      value={values.type}
      onValueChange={(type) =>
        onValuesChange({
          ...values,
          type: type as JobFormValues["type"],
        })
      }
      className="gap-3"
    >
      <TabsList aria-labelledby="job-trigger-label" className="w-full">
        <TabsTrigger value="cron">Recurring</TabsTrigger>
        <TabsTrigger value="once">One-time</TabsTrigger>
        <TabsTrigger value="event">Event</TabsTrigger>
      </TabsList>
      <TabsContent value="cron">
        <RecurringFields
          showRunPreview={showRunPreview}
          onValuesChange={onValuesChange}
          values={values}
        />
      </TabsContent>
      <TabsContent value="once" className="grid gap-2">
        <Suspense fallback={<DateTimeFallback />}>
          <JobDateTimePicker
            id="job-run-at"
            onValueChange={(runAt) => onValuesChange({ ...values, runAt })}
            timezone={localTimezone()}
            value={values.runAt}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="event">
        <Suspense fallback={<TimingFallback />}>{eventFields}</Suspense>
      </TabsContent>
    </Tabs>
  )
}

function TimingFallback() {
  return (
    <div aria-hidden="true" className="h-16 rounded-md border bg-muted/30" />
  )
}

function DateTimeFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-27 rounded-md border bg-muted/30 @md/editor:h-12"
    />
  )
}
