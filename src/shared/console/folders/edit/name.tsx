import { folderNameLimit } from "@contracts/folders/name"
import { Check, Folder, X } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { type FolderSummary } from "../tree"
import { type NameInputProps, useNameInput } from "./input"
import { type FolderSurface, useFolderEditing } from "./state"

/** Replaces the name, never nests an input inside its navigation link.
 *  A single mounted view claims the edit when the same folder is repeated. */
export function FolderName({
  folder,
  surface,
  children,
}: {
  folder: FolderSummary
  surface: FolderSurface
  children: ReactNode
}) {
  const editing = useFolderEditing()
  const container = useRef<HTMLFieldSetElement>(null)
  const target = useId()
  const match =
    editing?.edit?.folder.folderId === folder.folderId &&
    editing.edit.surface === surface &&
    !editing.edit.creating
  useEffect(() => {
    if (match && !editing?.edit?.target) {
      editing?.claim(target)
    }
  }, [match, editing, target])
  function close(restoreFocus: boolean) {
    editing?.close()
    if (restoreFocus) {
      requestAnimationFrame(() =>
        container.current
          ?.querySelector<HTMLElement>("a, button")
          ?.focus({ preventScroll: true })
      )
    }
  }
  return (
    <fieldset
      ref={container}
      className="min-w-0 flex-1"
      aria-label={folder.name}
      onKeyDown={(event) => {
        if (event.key === "F2" && !match) {
          event.preventDefault()
          event.stopPropagation()
          editing?.begin(folder, surface)
        }
      }}
    >
      {match && editing?.edit?.target === target ? (
        <div
          className={cn(
            "flex min-w-0 items-start gap-2",
            surface === "sidebar" && "px-2 py-1"
          )}
        >
          <Folder className="mt-1 size-4 shrink-0 text-muted-foreground" />
          <NameInput
            key={folder.folderId}
            initialName={editing.edit.folder.name}
            onClose={close}
            onSave={(name) => editing.save(folder.folderId, name)}
            register={editing.register}
          />
        </div>
      ) : (
        children
      )}
    </fieldset>
  )
}
function NameInput(props: NameInputProps) {
  const editor = useNameInput(props)
  const description = useId()
  return (
    <fieldset
      className="min-w-0 flex-1"
      aria-label="Rename folder"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.nativeEvent.isComposing) {
          return
        }
        if (event.key === "Enter") {
          event.preventDefault()
          void editor.commit(true)
        }
        if (event.key === "Escape") {
          event.preventDefault()
          editor.cancel()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          void editor.commit()
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-0.5">
        <Input
          ref={editor.input}
          aria-label="Folder name"
          aria-describedby={description}
          aria-invalid={editor.error ? true : undefined}
          aria-busy={editor.saving}
          readOnly={editor.saving}
          maxLength={folderNameLimit}
          value={editor.name}
          className={cn(
            "h-6 rounded-sm border-ring bg-background px-1 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-ring md:text-xs/relaxed pointer-coarse:h-8 pointer-coarse:text-base",
            editor.saving && "shimmer"
          )}
          onChange={(event) => editor.change(event.target.value)}
        />
        <NameControls editor={editor} />
      </div>
      <span
        id={description}
        className={
          editor.error ? "block py-1 text-destructive text-xs" : "sr-only"
        }
        role={editor.error ? "alert" : "status"}
      >
        {editor.error ??
          (editor.saving
            ? "Saving name."
            : "Enter saves. Escape keeps the previous name.")}
      </span>
    </fieldset>
  )
}
function NameControls({ editor }: { editor: ReturnType<typeof useNameInput> }) {
  return (
    <div
      className={cn(
        "hidden shrink-0 gap-0.5 pointer-coarse:flex",
        editor.error && "flex"
      )}
    >
      <Button
        aria-label="Save name"
        className="size-7 pointer-coarse:size-9"
        disabled={editor.saving}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void editor.commit(true)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        aria-label="Cancel rename"
        className="size-7 pointer-coarse:size-9"
        disabled={editor.saving}
        onMouseDown={(event) => event.preventDefault()}
        onClick={editor.cancel}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
