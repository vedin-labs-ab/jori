import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AutomationNameField({
  error,
  onValueChange,
  value,
}: {
  error: string | undefined
  onValueChange: (value: string) => void
  value: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="automation-name">Name</Label>
      <Input
        aria-describedby={
          error === undefined ? undefined : "automation-name-error"
        }
        aria-invalid={error === undefined ? undefined : true}
        id="automation-name"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Weekly release summary"
      />
      {error === undefined ? null : (
        <p
          className="text-destructive text-xs/relaxed"
          id="automation-name-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}
