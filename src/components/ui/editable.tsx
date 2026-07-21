"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Pencil, X } from "lucide-react"
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const triggerVariants = cva(
  "group/editable max-w-full justify-start px-0 hover:bg-transparent dark:hover:bg-transparent",
  {
    variants: {
      size: {
        sm: "h-6 text-xs/relaxed [&_svg]:size-3",
        md: "h-7 text-sm [&_svg]:size-3.5",
        lg: "h-8 text-base font-semibold [&_svg]:size-3.5",
        xl: "h-9 text-xl font-semibold tracking-tight [&_svg]:size-4",
      },
    },
    defaultVariants: { size: "md" },
  }
)

const editorVariants = cva("max-w-full", {
  variants: {
    size: {
      sm: "w-52",
      md: "w-60",
      lg: "w-72",
      xl: "w-80",
    },
  },
  defaultVariants: { size: "md" },
})

const inputGroupVariants = cva("min-w-0 flex-1", {
  variants: {
    size: {
      sm: "h-6",
      md: "h-7",
      lg: "h-8",
      xl: "h-9",
    },
  },
  defaultVariants: { size: "md" },
})

const inputVariants = cva(null, {
  variants: {
    size: {
      sm: "text-xs md:text-xs",
      md: "text-sm md:text-sm",
      lg: "text-base md:text-base",
      xl: "text-xl md:text-xl",
    },
  },
  defaultVariants: { size: "md" },
})

export type EditableTextProps = {
  label: string
  value: string
  onSave: (value: string) => void | Promise<void>
  autoComplete?: string
  className?: string
  disabled?: boolean
  displayValue?: ReactNode
  endContent?: ReactNode
  inputClassName?: string
  inputStart?: ReactNode
  onDraftChange?: (value: string) => void
  placeholder?: string
  saveDisabled?: boolean
  saveLabel?: ReactNode
  size?: VariantProps<typeof triggerVariants>["size"]
  transform?: (value: string) => string
  triggerClassName?: string
}

/**
 * A compact value that expands in place into a cancelable text editor.
 * Values are trimmed before save, and unchanged or empty drafts cannot submit.
 */
export function EditableText({
  label,
  value,
  onSave,
  autoComplete,
  className,
  disabled = false,
  displayValue,
  endContent,
  inputClassName,
  inputStart,
  onDraftChange,
  placeholder,
  saveDisabled = false,
  saveLabel = "Save",
  size = "md",
  transform,
  triggerClassName,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  useEffect(() => {
    if (!editing && !disabled && restoreFocusRef.current) {
      restoreFocusRef.current = false
      triggerRef.current?.focus()
    }
  }, [disabled, editing])

  function beginEditing() {
    setDraft(value)
    onDraftChange?.(value)
    setEditing(true)
  }

  function finishEditing() {
    restoreFocusRef.current = true
    setEditing(false)
  }

  function cancelEditing() {
    setDraft(value)
    onDraftChange?.(value)
    finishEditing()
  }

  function updateDraft(nextValue: string) {
    const transformedValue = transform?.(nextValue) ?? nextValue
    setDraft(transformedValue)
    onDraftChange?.(transformedValue)
  }

  const nextValue = draft.trim()
  const accessibleValue =
    typeof displayValue === "string" ? displayValue : value
  const canSave =
    nextValue.length > 0 && nextValue !== value && !saveDisabled && !disabled

  async function submit() {
    if (!canSave || saving) {
      return
    }

    setSaving(true)
    try {
      await onSave(nextValue)
      finishEditing()
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn("max-w-full", className)}
      data-size={size}
      data-slot="editable-text"
    >
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <ButtonGroup className={editorVariants({ size })}>
            <InputGroup className={inputGroupVariants({ size })}>
              {inputStart ? (
                <InputGroupAddon align="inline-start">
                  {inputStart}
                </InputGroupAddon>
              ) : null}
              <InputGroupInput
                aria-label={label}
                autoComplete={autoComplete}
                autoFocus
                className={cn(inputVariants({ size }), inputClassName)}
                disabled={disabled || saving}
                onChange={(event) => updateDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault()
                    event.stopPropagation()
                    cancelEditing()
                  }
                }}
                placeholder={placeholder}
                value={draft}
              />
              <InputGroupAddon align="inline-end">
                {endContent}
                <InputGroupButton
                  aria-label={`Cancel editing ${label.toLowerCase()}`}
                  disabled={disabled || saving}
                  onClick={cancelEditing}
                  size="icon-xs"
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <Button
              className={cn(size === "xl" && "h-9 text-sm")}
              disabled={!canSave || saving}
              size={size === "sm" ? "sm" : size === "md" ? "default" : "lg"}
              type="submit"
            >
              {saving ? <Spinner /> : null}
              {saveLabel}
            </Button>
          </ButtonGroup>
        </form>
      ) : (
        <Button
          aria-label={`Edit ${label.toLowerCase()}: ${accessibleValue}`}
          className={cn(triggerVariants({ size }), triggerClassName)}
          disabled={disabled}
          onClick={beginEditing}
          ref={triggerRef}
          type="button"
          variant="ghost"
        >
          <span className="truncate transition-opacity group-hover/editable:opacity-70 group-focus-visible/editable:opacity-70">
            {displayValue ?? value}
          </span>
          <Pencil className="text-muted-foreground transition-colors group-hover/editable:text-foreground group-focus-visible/editable:text-foreground" />
        </Button>
      )}
    </div>
  )
}
