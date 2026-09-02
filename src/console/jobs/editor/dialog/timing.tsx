import { lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { localTimezone } from "@/shared/console/time"
import { type JobFormValues } from "../../types"
import { RecurringFields } from "../schedule/recurring"

const JobDateTimePicker = lazy(async () => ({
  default: (await import("../schedule/picker")).JobDateTimePicker,
}))

const EventFields = lazy(async () => ({
  default: (await import("../event")).EventFields,
}))

export function JobTiming({
  organizationId,
  showRunPreview,
  onValuesChange,
  values,
}: {
  organizationId: string
  showRunPreview: boolean
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
}) {
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
      <TabsList className="w-full">
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
        <Suspense fallback={<TimingFallback />}>
          <JobDateTimePicker
            id="job-run-at"
            onValueChange={(runAt) => onValuesChange({ ...values, runAt })}
            timezone={localTimezone()}
            value={values.runAt}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="event">
        <Suspense fallback={<TimingFallback />}>
          <EventFields
            organizationId={organizationId}
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
