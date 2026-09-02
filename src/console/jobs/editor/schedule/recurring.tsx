import { FieldError } from "@/components/ui/field"
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
  getCrontabGuruUrl,
  monthDayOptions,
  previewRecurringRun,
  weekdayOptions,
} from "@/shared/console/jobs/cron"
import {
  type JobFormValues,
  type RepeatMode,
  repeatOptions,
} from "@/shared/console/jobs/types"
import { absoluteTime, relativeTime } from "@/shared/console/time"
import { FieldHelp } from "@/shared/field"
import { JobTimePicker } from "./time"

export function RecurringFields({
  showRunPreview = true,
  onValuesChange,
  values,
}: {
  showRunPreview?: boolean
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
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
        {/* Named by the visible word rather than a duplicate aria-label: a
            single-select ToggleGroup is a radiogroup, and unnamed it announces
            only "radio group" with no clue what Daily and Weekly are choosing
            between. */}
        <span
          className="font-medium text-xs/relaxed leading-none"
          id="schedule-repeat-label"
        >
          Repeats
        </span>
        <ToggleGroup
          aria-labelledby="schedule-repeat-label"
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
      {showRunPreview ? <RunPreview values={values} /> : null}
    </div>
  )
}

function RepeatDetails({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
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
      <JobTimePicker
        id="job-time"
        onValueChange={(time) => onValuesChange({ ...values, time })}
        timezone={values.timezone}
        value={values.time}
      />
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
  onValuesChange: (values: JobFormValues) => void
  values: JobFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="job-cron">Expression</Label>
        <CronHelp cron={values.cron} timezone={values.timezone} />
      </div>
      <Input
        className="font-mono"
        id="job-cron"
        onChange={(event) =>
          onValuesChange({ ...values, cron: event.target.value })
        }
        placeholder="0 9 * * 1-5"
        value={values.cron}
      />
    </div>
  )
}

function CronHelp({ cron, timezone }: { cron: string; timezone: string }) {
  return (
    <FieldHelp label="Expression help">
      <p>Uses five fields in {timezone}: minute, hour, day, month, weekday.</p>
      <a
        className="underline underline-offset-2"
        href={getCrontabGuruUrl(cron)}
        rel="noreferrer"
        target="_blank"
      >
        Open Crontab.guru
      </a>
    </FieldHelp>
  )
}

function RunPreview({ values }: { values: JobFormValues }) {
  const now = Date.now()
  const preview = previewRecurringRun(values, now)

  if ("error" in preview) {
    if (values.repeat === "custom" && values.cron.trim() === "") {
      return null
    }

    return <FieldError>{preview.error}</FieldError>
  }

  return (
    <p className="text-muted-foreground text-xs/relaxed">
      Next run {relativeTime(preview.runAt, now)} ·{" "}
      {absoluteTime(preview.runAt)}
    </p>
  )
}
