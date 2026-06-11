import { useQuery } from "convex/react"
import { Plus, Search } from "lucide-react"
import { useDeferredValue, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api } from "../../../convex/_generated/api"
import { ConsolePage } from "../page"
import { ScheduleDialog } from "./dialog"
import { type ScheduleEditor, useScheduleEditor } from "./editor"
import { EmptySchedules, ScheduleSkeletonList } from "./empty"
import { ScheduleRow } from "./row"
import {
  type ScheduleFilter,
  type ScheduleList,
  scheduleFilterOptions,
} from "./types"

export function Scheduling() {
  return (
    <ConsolePage>
      {(organization) => <SchedulingList tenantId={organization.id} />}
    </ConsolePage>
  )
}

function SchedulingList({ tenantId }: { tenantId: string }) {
  const [filter, setFilter] = useState<ScheduleFilter>("active")
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const scheduleList = useQuery(api.scheduling.console.list, {
    tenantId,
    query: deferredQuery,
    includeCompleted: filter === "all",
  })
  const editor = useScheduleEditor(tenantId)
  const now = useNow()

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <ScheduleFilters
        filter={filter}
        onCreate={editor.openCreateForm}
        query={query}
        setFilter={setFilter}
        setQuery={setQuery}
      />
      {editor.deleteError === undefined ? null : (
        <Alert variant="destructive">
          <AlertTitle>Could not delete schedule</AlertTitle>
          <AlertDescription>{editor.deleteError}</AlertDescription>
        </Alert>
      )}
      <ScheduleRows
        editor={editor}
        hasFilters={deferredQuery.trim() !== ""}
        now={now}
        scheduleList={scheduleList}
      />
      <ScheduleDialog
        error={editor.formError}
        isOpen={editor.isFormOpen}
        isSaving={editor.isSaving}
        onOpenChange={editor.setIsFormOpen}
        onSave={editor.saveSchedule}
        onValuesChange={editor.setFormValues}
        schedule={editor.formSchedule}
        values={editor.formValues}
      />
    </section>
  )
}

function ScheduleFilters({
  filter,
  onCreate,
  query,
  setFilter,
  setQuery,
}: {
  filter: ScheduleFilter
  onCreate: () => void
  query: string
  setFilter: (filter: ScheduleFilter) => void
  setQuery: (query: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <ToggleGroup
        className="flex-wrap justify-start"
        onValueChange={(value) => {
          if (value !== "") {
            setFilter(value as ScheduleFilter)
          }
        }}
        type="single"
        value={filter}
        variant="outline"
      >
        {scheduleFilterOptions.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none">
        <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-3.5 text-muted-foreground" />
          <Input
            aria-label="Search schedules"
            className="h-8 pr-2 pl-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search schedules..."
            value={query}
          />
        </div>
        <Button onClick={onCreate} size="lg" type="button">
          <Plus />
          New schedule
        </Button>
      </div>
    </div>
  )
}

function ScheduleRows({
  editor,
  hasFilters,
  now,
  scheduleList,
}: {
  editor: ScheduleEditor
  hasFilters: boolean
  now: number
  scheduleList: ScheduleList | undefined
}) {
  if (scheduleList === undefined) {
    return <ScheduleSkeletonList />
  }

  if (scheduleList.status === "unauthorized") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Schedule access unavailable</AlertTitle>
        <AlertDescription>{scheduleList.message}</AlertDescription>
      </Alert>
    )
  }

  if (scheduleList.schedules.length === 0) {
    return <EmptySchedules hasFilters={hasFilters} />
  }

  return (
    <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-2 overflow-y-auto">
      {scheduleList.schedules.map((schedule) => (
        <ScheduleRow
          isDeleting={editor.deletingScheduleId === schedule.id}
          key={schedule.id}
          now={now}
          onDelete={editor.deleteSchedule}
          onEdit={editor.openEditForm}
          schedule={schedule}
        />
      ))}
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)

    return () => window.clearInterval(interval)
  }, [])

  return now
}
