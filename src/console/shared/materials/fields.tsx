import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          onChange={(event) => onNameChange(event.target.value)}
          value={name}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Input
          id={`${idPrefix}-description`}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Optional note that helps others find it"
          value={description}
        />
      </div>
    </>
  )
}
