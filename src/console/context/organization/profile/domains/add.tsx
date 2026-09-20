import { parseWebsiteAddress } from "@contracts/website"
import { useMutation } from "convex/react"
import { Plus, X } from "lucide-react"
import { type Ref, useId, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { FieldError } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { showErrorToast } from "@/shared/console/error"
import { api } from "../../../../../../convex/_generated/api"
import {
  readWebsiteInputError,
  websiteInputErrorCopy,
} from "../../discovery/url"

/**
 * "+ Add" button that swaps into an inline input group for declaring an
 * email domain whose people count as part of the organization. Validates
 * with the same website contract as the Edit flow, on both sides of the
 * mutation.
 */
export function AddDomainControl({
  organizationId,
}: {
  organizationId: string
}) {
  const declareDomain = useMutation(api.organization.profile.declareDomain)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const trigger = useRef<HTMLButtonElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const restoreFocus = useRef(false)

  useLayoutEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false
      trigger.current?.focus()
    }
  }, [open])

  const close = () => {
    restoreFocus.current =
      form.current?.contains(document.activeElement) ?? false
    setOpen(false)
    setValue("")
    setError(null)
  }

  const onAdd = async () => {
    if (parseWebsiteAddress(value) === null) {
      setError(websiteInputErrorCopy)
      return
    }

    try {
      await declareDomain({ organizationId, domain: value })
      close()
    } catch (caught) {
      const inputError = readWebsiteInputError(caught)

      if (inputError === null) {
        showErrorToast(caught, "Could not add that domain.")
      } else {
        setError(inputError)
      }
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        ref={trigger}
        type="button"
        variant="outline"
      >
        <Plus /> Add
      </Button>
    )
  }

  return (
    <AddDomainForm
      error={error}
      formRef={form}
      onChange={(next) => {
        setValue(next)
        setError(null)
      }}
      onClose={close}
      onSubmit={() => void onAdd()}
      value={value}
    />
  )
}

function AddDomainForm({
  error,
  formRef,
  onChange,
  onClose,
  onSubmit,
  value,
}: {
  error: string | null
  formRef: Ref<HTMLFormElement>
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  value: string
}) {
  const errorId = useId()

  return (
    <form
      ref={formRef}
      className="grid min-w-0 justify-items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <ButtonGroup className="min-w-0 max-w-full">
        <InputGroup className="w-44 min-w-0 shrink">
          <InputGroupInput
            aria-describedby={error === null ? undefined : errorId}
            aria-invalid={error !== null}
            aria-label="Domain to add"
            autoFocus
            className="text-xs"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                onClose()
              }
            }}
            placeholder="acme.com"
            value={value}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              aria-label="Close"
              onClick={onClose}
              size="icon-xs"
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <Button
          className="shrink-0"
          disabled={value.trim() === ""}
          type="submit"
          variant="outline"
        >
          <Plus /> Add
        </Button>
      </ButtonGroup>
      {error === null ? null : (
        /* Zero intrinsic width so the column is sized by the button group
           alone: the hint starts at the input's left edge and wraps there. */
        <FieldError className="w-0 min-w-full" id={errorId}>
          {error}
        </FieldError>
      )}
    </form>
  )
}
