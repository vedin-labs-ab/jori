import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
      <div className="grid gap-1">
        <Input
          aria-describedby={
            error === undefined ? undefined : `${idPrefix}-name-error`
          }
          aria-invalid={error === undefined ? undefined : true}
          id={`${idPrefix}-name`}
          onChange={(event) => onNameChange(event.target.value)}
          value={name}
        />
        {error === undefined ? null : (
          <p
            className="text-destructive text-xs/relaxed"
            id={`${idPrefix}-name-error`}
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
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
      <Label htmlFor={`${idPrefix}-description`}>Description</Label>
      <Input
        id={`${idPrefix}-description`}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Optional note that helps others find it"
        value={description}
      />
    </div>
  )
}

/** Name and description inputs shared by material create and edit dialogs. */
export function MaterialDetailFields({
  description,
  idPrefix,
  name,
  onDescriptionChange,
  onNameChange,
}: {
  description: string
  idPrefix: string
  name: string
  onDescriptionChange: (description: string) => void
  onNameChange: (name: string) => void
}) {
  return (
    <>
      <MaterialNameField
        idPrefix={idPrefix}
        name={name}
        onNameChange={onNameChange}
      />
      <MaterialDescriptionField
        description={description}
        idPrefix={idPrefix}
        onDescriptionChange={onDescriptionChange}
      />
    </>
  )
}
