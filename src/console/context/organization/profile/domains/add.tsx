import { parseWebsiteAddress } from "@contracts/website"
import { useMutation } from "convex/react"
import { Plus, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { api } from "../../../../../../convex/_generated/api"
import { showErrorToast } from "../../../../shared/error"
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
export function AddDomainControl({ tenantId }: { tenantId: string }) {
  const declareDomain = useMutation(api.organization.profile.declareDomain)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  const close = () => {
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
      await declareDomain({ tenantId, domain: value })
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
        className="h-7 px-2.5 text-xs"
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-3.5" /> Add
      </Button>
    )
  }

  return (
    <AddDomainForm
      error={error}
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
  onChange,
  onClose,
  onSubmit,
  value,
}: {
  error: string | null
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
  value: string
}) {
  return (
    <form
      className="grid justify-items-end gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <ButtonGroup>
        <InputGroup className="w-44">
          <InputGroupInput
            aria-invalid={error !== null}
            aria-label="Domain to add"
            autoFocus
            className="text-xs"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
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
          className="h-7 px-2.5 text-xs"
          disabled={value.trim() === ""}
          size="sm"
          type="submit"
          variant="outline"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </ButtonGroup>
      {error === null ? null : (
        /* Zero intrinsic width so the column is sized by the button group
           alone: the hint starts at the input's left edge and wraps there. */
        <p className="w-0 min-w-full text-destructive text-xs">{error}</p>
      )}
    </form>
  )
}
