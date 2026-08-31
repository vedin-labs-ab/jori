import { type Visibility } from "@contracts/visibility"
import { type GenericId } from "convex/values"
import { ChevronDown, Loader2 } from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { showErrorToast } from "../error"
import { VisibilityField } from "../visibility/field"
import { MaterialDescriptionField, MaterialNameField } from "./fields"

/** Form wrapper for dialog fields and footer: Enter in a single-line input
 *  submits through the same handler as the primary button, and Enter in a
 *  textarea keeps inserting newlines. Pass the primary button's `disabled`
 *  expression so Enter stays inert exactly when the button is; keep the
 *  primary button `type="submit"` and every other button `type="button"`.
 *  Omit `onSubmit` for editors that deliberately stay button-only: the form
 *  semantics remain, and Enter never submits. */
export function DialogForm({
  children,
  className,
  disabled = false,
  onSubmit,
}: {
  children: ReactNode
  className?: string
  disabled?: boolean
  onSubmit?: () => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!disabled) {
      onSubmit?.()
    }
  }

  return (
    <form className={cn("grid gap-4", className)} onSubmit={handleSubmit}>
      {children}
    </form>
  )
}

/** Collapsed-by-default home for a create flow's secondary fields — folder,
 *  sharing, and the like — so the dialog leads with what actually defines
 *  the material. Callers pass whichever fields their material carries. */
export function AdvancedSettings({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="grid gap-4">
      {/* Styled as a section boundary rather than a link: small muted text
          with a hairline running to the dialog's edge, matching the
          platform's divider language. */}
      <CollapsibleTrigger className="flex w-full items-center gap-2 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground [&[data-state=open]>svg]:rotate-180">
        Advanced settings
        <ChevronDown className="size-3 transition-transform duration-200 ease-out" />
        <span aria-hidden className="h-px flex-1 bg-border" />
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-4">{children}</CollapsibleContent>
    </Collapsible>
  )
}

/** The create flow every material kind shares: name, description, and the
 *  advanced folder and sharing fields. Only the noun, the blurb under the
 *  title, and the mutation differ between kinds. */
export function CreateMaterialDialog({
  blurb,
  create,
  folderField,
  initialFolderId,
  isOpen,
  noun,
  onOpenChange,
  organizationId,
}: {
  blurb: string
  create: (args: CreateMaterialArgs) => Promise<unknown>
  /** The folder picker, supplied by the page: this module sits below the
   *  folders domain and may not reach into it. */
  folderField: (props: {
    id: string
    onChange: (folderId: string | null) => void
    value: string | null
  }) => ReactNode
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  noun: string
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateMaterial({
    create,
    initialFolderId: initialFolderId ?? null,
    noun,
    onCreated: () => onOpenChange(false),
    organizationId,
  })
  const idPrefix = `${noun}-create`

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!form.isCreating) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create {noun}</DialogTitle>
          <DialogDescription>{blurb}</DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.nameError}
            idPrefix={idPrefix}
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix={idPrefix}
            onDescriptionChange={form.setDescription}
          />
          <AdvancedSettings>
            {folderField({
              id: `${idPrefix}-folder`,
              onChange: form.setFolderId,
              value: form.folderId,
            })}
            <VisibilityField
              id={`${idPrefix}-visibility`}
              noun={noun}
              onChange={form.setVisibility}
              organizationId={organizationId}
              value={form.visibility}
            />
          </AdvancedSettings>
          <DialogFooter>
            <Button disabled={form.isCreating} type="submit">
              {form.isCreating ? <Loader2 className="animate-spin" /> : null}
              Create {noun}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

type CreateMaterialArgs = {
  description?: string
  folderId?: GenericId<"folders">
  name: string
  organizationId: string
  visibility?: Visibility
}

function useCreateMaterial({
  create,
  initialFolderId,
  noun,
  onCreated,
  organizationId,
}: {
  create: (args: CreateMaterialArgs) => Promise<unknown>
  initialFolderId: string | null
  noun: string
  onCreated: () => void
  organizationId: string
}) {
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<Visibility>({
    mode: "organization",
  })
  const [folderId, setFolderId] = useState(initialFolderId)
  const [isCreating, setIsCreating] = useState(false)

  // Validation shows only after a submit attempt; new input clears it.
  function setName(next: string) {
    setNameState(next)
    setNameError(undefined)
  }

  async function submit() {
    if (name.trim() === "") {
      setNameError(`Give the ${noun} a name.`)

      return
    }

    setIsCreating(true)

    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        visibility,
        folderId:
          folderId === null ? undefined : (folderId as GenericId<"folders">),
      })

      toast.success(`Created ${name.trim()}.`)
      setNameState("")
      setDescription("")
      setVisibility({ mode: "organization" })
      setFolderId(initialFolderId)
      onCreated()
    } catch (error) {
      showErrorToast(error, `Could not create the ${noun}.`)
    } finally {
      setIsCreating(false)
    }
  }

  return {
    description,
    folderId,
    isCreating,
    name,
    nameError,
    setDescription,
    setFolderId,
    setName,
    setVisibility,
    submit,
    visibility,
  }
}
