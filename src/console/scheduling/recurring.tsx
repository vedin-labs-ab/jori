import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  composeCron,
  monthDayOptions,
  previewRecurringRun,
  weekdayOptions,
} from "./cron"
import { absoluteTime, relativeTime } from "./format"
import {
  type RepeatMode,
  repeatOptions,
  type ScheduleFormValues,
} from "./types"

export function RecurringFields({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  function updateRepeat(repeat: RepeatMode) {
    // Entering custom mode starts from the equivalent expression so the
    // current selection is never silently discarded.
    const cron =
      repeat === "custom" && values.cron.trim() === ""
        ? composeCron(values)
        : values.cron

    onValuesChange({ ...values, cron, repeat })
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <span className="font-medium text-xs/relaxed leading-none">
          Repeats
        </span>
        <ToggleGroup
          className="flex-wrap justify-start"
          onValueChange={(repeat) => {
            if (repeat !== "") {
              updateRepeat(repeat as RepeatMode)
            }
          }}
          type="single"
          value={values.repeat}
          variant="outline"
        >
          {repeatOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {values.repeat === "custom" ? (
        <CustomCronField onValuesChange={onValuesChange} values={values} />
      ) : (
        <RepeatDetails onValuesChange={onValuesChange} values={values} />
      )}
      <RunPreview values={values} />
    </div>
  )
}

function RepeatDetails({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {values.repeat === "weekly" ? (
        <DaySelect
          label="Day"
          onValueChange={(weekday) => onValuesChange({ ...values, weekday })}
          options={weekdayOptions}
          value={values.weekday}
        />
      ) : null}
      {values.repeat === "monthly" ? (
        <DaySelect
          label="Day of month"
          onValueChange={(monthDay) => onValuesChange({ ...values, monthDay })}
          options={monthDayOptions}
          value={values.monthDay}
        />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="schedule-time">Time (UTC)</Label>
        <Input
          className="w-32"
          id="schedule-time"
          onChange={(event) =>
            onValuesChange({ ...values, time: event.target.value })
          }
          type="time"
          value={values.time}
        />
      </div>
    </div>
  )
}

function DaySelect({
  label,
  onValueChange,
  options,
  value,
}: {
  label: string
  onValueChange: (value: string) => void
  options: readonly { label: string; value: string }[]
  value: string
}) {
  return (
    <div className="grid min-w-40 flex-1 gap-2">
      <span className="font-medium text-xs/relaxed leading-none">{label}</span>
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CustomCronField({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="schedule-cron">Cron expression</Label>
      <Input
        className="font-mono"
        id="schedule-cron"
        onChange={(event) =>
          onValuesChange({ ...values, cron: event.target.value })
        }
        placeholder="0 9 * * 1-5"
        value={values.cron}
      />
      <p className="text-muted-foreground text-xs">
        Five fields in UTC: minute, hour, day of month, month, day of week.
      </p>
    </div>
  )
}

function RunPreview({ values }: { values: ScheduleFormValues }) {
  const now = Date.now()
  const preview = previewRecurringRun(values, now)

  if ("error" in preview) {
    if (values.repeat === "custom" && values.cron.trim() === "") {
      return null
    }

    return <p className="text-destructive text-xs">{preview.error}</p>
  }

  return (
    <p className="text-muted-foreground text-xs">
      Next run {relativeTime(preview.runAt, now)} ·{" "}
      {absoluteTime(preview.runAt)}
    </p>
  )
}
