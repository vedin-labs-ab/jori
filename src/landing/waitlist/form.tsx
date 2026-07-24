import { teamSizeLabels, teamSizes, waitlistLimits } from "@contracts/waitlist"
import { Check } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { joinWaitlist } from "./client"

type Status = "idle" | "submitting" | "joined"

export function WaitlistForm() {
  const fieldId = useId()
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string>()

  if (status === "joined") {
    return <Joined />
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    setStatus("submitting")
    setError(undefined)

    try {
      const result = await joinWaitlist({
        email: String(data.get("email") ?? ""),
        size: String(data.get("size") ?? ""),
        work: String(data.get("work") ?? ""),
      })

      if (result.status === "rejected") {
        setError(result.message)
        setStatus("idle")

        return
      }

      setStatus("joined")
    } catch {
      setError("Something went wrong. Try again in a moment.")
      setStatus("idle")
    }
  }

  const isSubmitting = status === "submitting"

  return (
    <form className="grid max-w-xl gap-5" noValidate onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor={`${fieldId}-email`}>Work email</FieldLabel>
          <Input
            autoComplete="email"
            id={`${fieldId}-email`}
            maxLength={waitlistLimits.email}
            name="email"
            placeholder="you@company.com"
            type="email"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${fieldId}-size`}>Team size</FieldLabel>
          <NativeSelect defaultValue="10-24" id={`${fieldId}-size`} name="size">
            {teamSizes.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {teamSizeLabels[size]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor={`${fieldId}-work`}>
          What does your team do by hand every week?
        </FieldLabel>
        <Textarea
          id={`${fieldId}-work`}
          maxLength={waitlistLimits.work}
          name="work"
          placeholder="The release checklist. Someone reads every PR and Linear issue on Thursday and writes up what is ready."
          rows={3}
        />
      </Field>
      {error === undefined ? null : (
        <FieldError className="-mt-1">{error}</FieldError>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button disabled={isSubmitting} size="lg" type="submit">
          {isSubmitting ? <Spinner /> : null}
          Join the waitlist
        </Button>
        <p className="text-muted-foreground text-xs">
          One email when there's a spot. Nothing else.
        </p>
      </div>
    </form>
  )
}

function Joined() {
  return (
    <div className="flex max-w-xl items-start gap-3 rounded-xl border bg-card p-5">
      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-sm">You're on the list.</p>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          Check your inbox for a confirmation. We're opening to a few teams at a
          time, and you can reply to that email if you want to jump the queue.
        </p>
      </div>
    </div>
  )
}
