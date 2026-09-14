import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Name input shared by material import and edit dialogs. The error, when
 *  given, renders inline; callers surface it on submit attempts and clear
 *  it as soon as new input arrives. */
export function MaterialNameField({
  error,
  idPrefix,
  name,
  onNameChange,
}: {
  error?: string
  idPrefix: string
  name: string
  onNameChange: (name: string) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${idPrefix}-name`}>Name</Label>
      <Input
        aria-describedby={
          error === undefined ? undefined : `${idPrefix}-name-error`
        }
        aria-invalid={error === undefined ? undefined : true}
        id={`${idPrefix}-name`}
        onChange={(event) => onNameChange(event.target.value)}
        value={name}
      />
      <FieldError reserve id={`${idPrefix}-name-error`}>
        {error}
      </FieldError>
    </div>
  )
}
