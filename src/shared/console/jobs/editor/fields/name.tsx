import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function JobNameField({
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
      <Label htmlFor="job-name">Name</Label>
      <Input
        aria-describedby={error === undefined ? undefined : "job-name-error"}
        aria-invalid={error === undefined ? undefined : true}
        id="job-name"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Weekly release summary"
      />
      <FieldError id="job-name-error">{error}</FieldError>
    </div>
  )
}
