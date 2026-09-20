import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { readErrorMessage } from "@/shared/console/error"
import { OnboardingStep } from "./step"

/** Where an organization starts: its name. A person's first organization is
 *  also their welcome to Jori; a later one is named and can be backed out of. */
export function NameStep({
  name,
  onCancel,
  onCreate,
}: {
  /** What to call the person on their first organization. */
  name: string | undefined
  /** Backs out, for a person who has an organization to go back to. */
  onCancel?: () => void
  /** Creates and opens the organization. Opening it remounts onboarding on
   *  the next step, so the button keeps its spinner until then. */
  onCreate: (organization: string) => Promise<void>
}) {
  const [organization, setOrganization] = useState("")
  const [error, setError] = useState<string>()
  const [isCreating, setIsCreating] = useState(false)

  const submit = async () => {
    if (organization.trim() === "") {
      setError("Name your organization.")

      return
    }

    setIsCreating(true)

    try {
      await onCreate(organization.trim())
    } catch (caught) {
      setError(readErrorMessage(caught, "Couldn't create the organization."))
      setIsCreating(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <OnboardingStep
        {...copy(onCancel === undefined, name)}
        primary={
          <Button disabled={isCreating} type="submit">
            {isCreating ? <Spinner /> : null}
            Continue
          </Button>
        }
        secondary={cancel(onCancel, isCreating)}
      >
        <div className="grid gap-2">
          <Label htmlFor="onboarding-organization">Organization name</Label>
          <Input
            aria-describedby="onboarding-organization-error"
            aria-invalid={error === undefined ? undefined : true}
            autoFocus
            disabled={isCreating}
            id="onboarding-organization"
            onChange={(event) => {
              setOrganization(event.target.value)
              setError(undefined)
            }}
            placeholder="Acme"
            value={organization}
          />
          <FieldError id="onboarding-organization-error">{error}</FieldError>
        </div>
      </OnboardingStep>
    </form>
  )
}

function copy(first: boolean, name: string | undefined) {
  if (!first) {
    return {
      title: "New organization",
      description:
        "Each organization has its own folders, members, and billing. Start with its name.",
    }
  }

  return {
    title:
      name === undefined ? "Welcome to Jori." : `Welcome to Jori, ${name}.`,
    description:
      "Jori is a shared drive for the work you hand to AI. Describe a job in plain words, say when it runs, and it runs. Start by naming your organization.",
  }
}

function cancel(
  onCancel: (() => void) | undefined,
  disabled: boolean
): ReactNode {
  return onCancel === undefined ? undefined : (
    <Button
      disabled={disabled}
      onClick={onCancel}
      type="button"
      variant="ghost"
    >
      Cancel
    </Button>
  )
}
