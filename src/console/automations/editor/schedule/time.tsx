import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AutomationTimePicker({
  id,
  onValueChange,
  timezone,
  value,
}: {
  id: string
  onValueChange: (value: string) => void
  timezone: string
  value: string
}) {
  return (
    <div className="grid w-full min-w-32 gap-2 sm:w-max">
      <Label className="whitespace-nowrap" htmlFor={id}>
        <span>
          Time{" "}
          <span className="font-normal text-muted-foreground">
            ({timezone})
          </span>
        </span>
      </Label>
      <Input
        id={id}
        onChange={(event) => onValueChange(event.target.value)}
        type="time"
        value={value}
      />
    </div>
  )
}
