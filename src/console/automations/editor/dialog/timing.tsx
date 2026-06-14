import { lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type AutomationFormValues } from "../../types"
import { RecurringFields } from "../recurring"

const AutomationDateTimePicker = lazy(async () => ({
  default: (await import("../picker")).AutomationDateTimePicker,
}))

const EventFields = lazy(async () => ({
  default: (await import("../event")).EventFields,
}))

export function AutomationTiming({
  tenantId,
  showRunPreview,
  onValuesChange,
  values,
}: {
  tenantId: string
  showRunPreview: boolean
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
        <RecurringFields
          showRunPreview={showRunPreview}
          onValuesChange={onValuesChange}
          values={values}
        />
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
