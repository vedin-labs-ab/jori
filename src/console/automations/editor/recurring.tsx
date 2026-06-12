import { CircleHelp } from "lucide-react"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  composeCron,
  monthDayOptions,
  previewRecurringRun,
  weekdayOptions,
} from "../cron"
import { absoluteTime, relativeTime } from "../format"
import {
  type AutomationFormValues,
  type RepeatMode,
  repeatOptions,
} from "../types"
import { AutomationTimePicker } from "./time"

export function RecurringFields({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
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
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
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
      <AutomationTimePicker
        className="w-32"
        id="automation-time"
        label="Time (UTC)"
        onValueChange={(time) => onValuesChange({ ...values, time })}
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
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="automation-cron">Expression</Label>
        <CronHelp />
      </div>
      <Input
        className="font-mono"
        id="automation-cron"
        onChange={(event) =>
          onValuesChange({ ...values, cron: event.target.value })
        }
        placeholder="0 9 * * 1-5"
        value={values.cron}
      />
    </div>
  )
}

function CronHelp() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Expression help"
            className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            type="button"
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="max-w-72 items-start text-left leading-relaxed"
          side="right"
        >
          <div className="grid gap-1">
            <p>Uses five UTC fields: minute, hour, day, month, weekday.</p>
            <a
              className="underline underline-offset-2"
              href="https://crontab.guru/"
              rel="noreferrer"
              target="_blank"
            >
              Open Crontab.guru
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function RunPreview({ values }: { values: AutomationFormValues }) {
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
