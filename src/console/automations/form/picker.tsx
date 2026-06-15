import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AutomationTimePicker } from "./schedule/time"

const defaultTime = "09:00"

export function AutomationDateTimePicker({
  id,
  onValueChange,
  value,
}: {
  id: string
  onValueChange: (value: string) => void
  value: string
}) {
  const selectedDate = readDatetimeDate(value)
  const selectedTime = readDatetimeTime(value)
  const [pendingTime, setPendingTime] = useState(
    selectedTime === "" ? defaultTime : selectedTime
  )
  const timeValue = selectedTime === "" ? pendingTime : selectedTime

  useEffect(() => {
    if (selectedTime !== "") {
      setPendingTime(selectedTime)
    }
  }, [selectedTime])

  function updateDate(date: Date | undefined) {
    if (date === undefined) {
      onValueChange("")
      return
    }

    onValueChange(formatDatetimeValue(date, normalizeTime(timeValue)))
  }

  function updateTime(time: string) {
    setPendingTime(time)

    if (time === "") {
      onValueChange("")
      return
    }

    if (selectedDate !== undefined) {
      onValueChange(formatDatetimeValue(selectedDate, normalizeTime(time)))
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-date`}>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              aria-label={`Date: ${
                selectedDate === undefined
                  ? "Select date"
                  : format(selectedDate, "PPP")
              }`}
              className="w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
              data-empty={selectedDate === undefined}
              id={`${id}-date`}
              type="button"
              variant="outline"
            >
              <CalendarIcon />
              {selectedDate === undefined ? (
                <span>Select date</span>
              ) : (
                format(selectedDate, "PPP")
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              defaultMonth={selectedDate}
              mode="single"
              onSelect={updateDate}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>
      </div>
      <AutomationTimePicker
        id={`${id}-time`}
        label="Time"
        onValueChange={updateTime}
        value={timeValue}
      />
    </div>
  )
}

function readDatetimeDate(value: string) {
  const parts = readDatetimeParts(value)

  if (parts === null) {
    return undefined
  }

  const date = new Date(parts.year, parts.month - 1, parts.day)

  if (
    date.getFullYear() !== parts.year ||
    date.getMonth() !== parts.month - 1 ||
    date.getDate() !== parts.day
  ) {
    return undefined
  }

  return date
}

function readDatetimeTime(value: string) {
  const parts = readDatetimeParts(value)

  if (parts === null) {
    return ""
  }

  return `${pad(parts.hour)}:${pad(parts.minute)}`
}

function readDatetimeParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)

  if (match === null) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  }
}

function formatDatetimeValue(date: Date, time: string) {
  return `${formatDateValue(date)}T${time}`
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function normalizeTime(time: string) {
  return /^\d{2}:\d{2}$/.test(time) ? time : defaultTime
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}
