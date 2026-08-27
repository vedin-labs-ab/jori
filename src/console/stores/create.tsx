import { type Scope } from "@contracts/permissions/scope"
import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import { parseJsonText } from "../shared/json/parse"
import { MaterialDetailFields } from "../shared/materials/fields"
import { MaterialScopeField } from "../shared/materials/scope"

const defaultSchemaText = `{
  "type": "object"
}`

export function CreateStoreDialog({
  isOpen,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateStore(organizationId, () => onOpenChange(false))
  const parsedSchema = parseJsonText(form.schemaText)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!form.isCreating) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create store</DialogTitle>
          <DialogDescription>
            One JSON document validated against a schema fixed at creation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <MaterialDetailFields
            description={form.description}
            idPrefix="store-create"
            name={form.name}
            onDescriptionChange={form.setDescription}
            onNameChange={form.setName}
          />
          <MaterialScopeField
            id="store-create-scope"
            noun="store"
            onScopeChange={form.setScope}
            scope={form.scope}
          />
          <div className="grid gap-2">
            <Label htmlFor="store-create-schema">JSON Schema</Label>
            <Textarea
              className="min-h-40 font-mono text-xs"
              id="store-create-schema"
              onChange={(event) => form.setSchemaText(event.target.value)}
              value={form.schemaText}
            />
            {parsedSchema.ok ? null : (
              <p className="text-destructive text-xs">{parsedSchema.error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={
              form.name.trim() === "" || !parsedSchema.ok || form.isCreating
            }
            onClick={() => {
              if (parsedSchema.ok) {
                void form.submit(parsedSchema.value)
              }
            }}
            type="button"
          >
            {form.isCreating ? <Loader2 className="animate-spin" /> : null}
            Create store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function useCreateStore(organizationId: string, onCreated: () => void) {
  const create = useMutation(api.stores.console.create)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [schemaText, setSchemaText] = useState(defaultSchemaText)
  const [isCreating, setIsCreating] = useState(false)

  async function submit(schema: unknown) {
    setIsCreating(true)

    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        scope,
        schema,
      })
      toast.success(`Created ${name.trim()}.`)
      setName("")
      setDescription("")
      setScope("organization")
      setSchemaText(defaultSchemaText)
      onCreated()
    } catch (error) {
      showErrorToast(error, "Could not create the store.")
    } finally {
      setIsCreating(false)
    }
  }

  return {
    description,
    isCreating,
    name,
    schemaText,
    scope,
    setDescription,
    setName,
    setSchemaText,
    setScope,
    submit,
  }
}
