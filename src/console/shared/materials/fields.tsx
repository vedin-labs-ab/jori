import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FieldHelp } from "@/shared/field"

/** Name input shared by material create and edit dialogs. The error, when
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
      <FieldError id={`${idPrefix}-name-error`}>{error}</FieldError>
    </div>
  )
}

export function MaterialDescriptionField({
  description,
  idPrefix,
  onDescriptionChange,
}: {
  description: string
  idPrefix: string
  onDescriptionChange: (description: string) => void
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`${idPrefix}-description`}>
          Description
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <FieldHelp label="Description help">
          <p>
            A sentence on what this holds and when to use it. It helps teammates
            find it — and tells Jori when to reach for it.
          </p>
        </FieldHelp>
      </div>
      <Input
        id={`${idPrefix}-description`}
        onChange={(event) => onDescriptionChange(event.target.value)}
        value={description}
      />
    </div>
  )
}
