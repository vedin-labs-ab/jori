import { Check, X } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { editIcons } from "./icons"
import { type NameInputProps, useNameInput } from "./input"
import { type EditItem, type EditSurface, useEditing } from "./state"

/** Replaces the name, never nests an input inside its navigation link.
 *  A single mounted view claims the edit when the same item is repeated. */
export function ItemName({
  item,
  surface,
  children,
}: {
  item: EditItem
  surface: EditSurface
  children: ReactNode
}) {
  const editing = useEditing()
  const container = useRef<HTMLFieldSetElement>(null)
  const target = useId()
  const Icon = editIcons[item.kind]
  const match =
    editing?.edit?.item.id === item.id &&
    editing.edit.item.kind === item.kind &&
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
      restoreNameFocus(container.current, item)
    }
  }
  return (
    <fieldset
      ref={container}
      className="min-w-0 flex-1"
      aria-label={item.name}
      onKeyDown={(event) => {
        if (event.key === "F2" && !match) {
          event.preventDefault()
          event.stopPropagation()
          editing?.begin(item, surface)
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
          <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
          <NameInput
            key={item.id}
            initialName={editing.edit.item.name}
            noun={item.kind}
            scrollBlock={surface === "sidebar" ? "center" : "nearest"}
            onClose={close}
            onSave={(name) => editing.save(item, name)}
            register={editing.register}
          />
        </div>
      ) : (
        children
      )}
    </fieldset>
  )
}
function NameInput(props: NameInputProps & { noun: EditItem["kind"] }) {
  const editor = useNameInput(props)
  const description = useId()
  return (
    <fieldset
      className="min-w-0 flex-1"
      aria-label={`Rename ${props.noun}`}
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
          editor.blur(event.currentTarget)
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Input
          ref={editor.input}
          aria-label={`${props.noun[0].toUpperCase()}${props.noun.slice(1)} name`}
          aria-describedby={description}
          aria-invalid={editor.error ? true : undefined}
          aria-busy={editor.saving}
          readOnly={editor.saving}
          maxLength={120}
          enterKeyHint="done"
          value={editor.name}
          className={cn(
            "h-6 rounded-sm bg-background px-1 text-sm shadow-none focus-visible:ring-1 md:text-xs/relaxed",
            editor.saving && "shimmer"
          )}
          onChange={(event) => editor.change(event.target.value)}
        />
        <NameControls editor={editor} />
      </div>
      <span
        id={description}
        className={
          editor.error
            ? "block whitespace-normal py-1 text-destructive text-xs"
            : "sr-only"
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
const controlHitArea =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1"

function NameControls({ editor }: { editor: ReturnType<typeof useNameInput> }) {
  return (
    <div
      className={cn(
        "hidden shrink-0 gap-2 pointer-coarse:flex",
        editor.error && "flex"
      )}
    >
      <Button
        aria-label="Save name"
        className={controlHitArea}
        disabled={editor.saving}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void editor.commit(true)}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Check />
      </Button>
      <Button
        aria-label="Cancel rename"
        className={controlHitArea}
        disabled={editor.saving}
        onMouseDown={(event) => event.preventDefault()}
        onClick={editor.cancel}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}

function restoreNameFocus(
  container: HTMLFieldSetElement | null,
  item: EditItem
) {
  const scope = container?.closest("[data-slot=sidebar-provider]") ?? document
  requestAnimationFrame(() => {
    const local = container?.isConnected
      ? container.querySelector<HTMLElement>("a, button")
      : undefined
    const key = `${item.kind}:${item.id}`
    const link = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-edit-key]")
    ).find((element) => element.dataset.editKey === key)
    ;(
      local ??
      link ??
      scope.querySelector<HTMLElement>("[data-create-kind]")
    )?.focus({ preventScroll: true })
  })
}
