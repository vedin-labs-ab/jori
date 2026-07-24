import {
  teamSizeLabels,
  teamSizes,
  type WaitlistField,
  waitlistLimits,
} from "@contracts/waitlist"
import { Check } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { joinWaitlist } from "./client"

type Status = "idle" | "submitting" | "joined"

/** Field rejections mark their own input; anything that is not about one
 *  field lands under the submit button, where a form-level notice belongs. */
type Rejection =
  | { kind: "field"; field: WaitlistField; message: string }
  | { kind: "form"; message: string }

const throttledMessage =
  "That's a lot of signups from here. Try again in a few minutes."
const failedMessage = "Something went wrong. Try again in a moment."

export function WaitlistForm() {
  const fieldId = useId()
  const [status, setStatus] = useState<Status>("idle")
  const [rejection, setRejection] = useState<Rejection>()

  if (status === "joined") {
    return <Joined />
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("submitting")
    setRejection(undefined)

    const outcome = await requestSpot(event.currentTarget)

    setRejection(outcome)
    setStatus(outcome === undefined ? "joined" : "idle")
  }

  const invalid = rejection?.kind === "field" ? rejection.field : undefined

  return (
    <form className="grid max-w-xl gap-5" noValidate onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <EmailField fieldId={fieldId} invalid={invalid} rejection={rejection} />
        <SizeField fieldId={fieldId} invalid={invalid} rejection={rejection} />
      </div>
      <WorkField fieldId={fieldId} invalid={invalid} rejection={rejection} />
      <Honeypot />
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button disabled={status === "submitting"} type="submit">
            {status === "submitting" ? <Spinner /> : null}
            Join the waitlist
          </Button>
          <p className="text-muted-foreground text-xs">
            One email when there's a spot. Nothing else.
          </p>
        </div>
        {rejection?.kind === "form" ? (
          <FieldError className="mt-2">{rejection.message}</FieldError>
        ) : null}
      </div>
    </form>
  )
}

type FieldProps = {
  fieldId: string
  invalid: WaitlistField | undefined
  rejection: Rejection | undefined
}

function EmailField({ fieldId, invalid, rejection }: FieldProps) {
  return (
    <Field data-invalid={invalid === "email"}>
      <FieldLabel htmlFor={`${fieldId}-email`}>Work email</FieldLabel>
      <Input
        aria-describedby={describedBy(fieldId, invalid, "email")}
        aria-invalid={invalid === "email"}
        autoComplete="email"
        id={`${fieldId}-email`}
        maxLength={waitlistLimits.email}
        name="email"
        placeholder="you@company.com"
        required
        type="email"
      />
      <FieldError id={errorId(fieldId, "email")}>
        {fieldMessage(rejection, "email")}
      </FieldError>
    </Field>
  )
}

function SizeField({ fieldId, invalid, rejection }: FieldProps) {
  return (
    <Field data-invalid={invalid === "size"}>
      <FieldLabel htmlFor={`${fieldId}-size`}>Team size</FieldLabel>
      <NativeSelect
        aria-describedby={describedBy(fieldId, invalid, "size")}
        aria-invalid={invalid === "size"}
        defaultValue="10-24"
        id={`${fieldId}-size`}
        name="size"
      >
        {teamSizes.map((size) => (
          <NativeSelectOption key={size} value={size}>
            {teamSizeLabels[size]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldError id={errorId(fieldId, "size")}>
        {fieldMessage(rejection, "size")}
      </FieldError>
    </Field>
  )
}

function WorkField({ fieldId, invalid, rejection }: FieldProps) {
  return (
    <Field data-invalid={invalid === "work"}>
      <FieldLabel htmlFor={`${fieldId}-work`}>
        What does your team do by hand every week?
      </FieldLabel>
      <Textarea
        aria-describedby={describedBy(fieldId, invalid, "work")}
        aria-invalid={invalid === "work"}
        id={`${fieldId}-work`}
        maxLength={waitlistLimits.work}
        name="work"
        placeholder="The release checklist. Someone reads every PR and Linear issue on Thursday and writes up what is ready."
        required
        rows={3}
      />
      <FieldError id={errorId(fieldId, "work")}>
        {fieldMessage(rejection, "work")}
      </FieldError>
    </Field>
  )
}

/** One round trip, reduced to what the form does next: a rejection to show,
 *  or nothing left to say. */
async function requestSpot(form: HTMLFormElement) {
  const data = new FormData(form)
  const result = await joinWaitlist({
    company: String(data.get("company") ?? ""),
    email: String(data.get("email") ?? ""),
    size: String(data.get("size") ?? ""),
    work: String(data.get("work") ?? ""),
  }).catch(() => ({ status: "failed" }) as const)

  return result.status === "joined" ? undefined : readRejection(result)
}

/** A field no person can see, reach by tab, or have filled for them. Only an
 *  automated submission puts anything in it. */
function Honeypot() {
  return (
    <div aria-hidden="true" className="hidden">
      <label htmlFor="company-role">Company role</label>
      <input
        autoComplete="off"
        defaultValue=""
        id="company-role"
        name="company"
        tabIndex={-1}
        type="text"
      />
    </div>
  )
}

function readRejection(result: {
  status: "rejected" | "throttled" | "failed"
  field?: WaitlistField
  message?: string
}): Rejection {
  if (result.status === "rejected" && result.field !== undefined) {
    return {
      kind: "field",
      field: result.field,
      message: result.message ?? failedMessage,
    }
  }

  return {
    kind: "form",
    message: result.status === "throttled" ? throttledMessage : failedMessage,
  }
}

function fieldMessage(rejection: Rejection | undefined, field: WaitlistField) {
  return rejection?.kind === "field" && rejection.field === field
    ? rejection.message
    : null
}

function errorId(fieldId: string, field: WaitlistField) {
  return `${fieldId}-${field}-error`
}

/** Only point at the message when there is one: FieldError renders nothing
 *  until it has content, and a dangling reference reads as an empty hint. */
function describedBy(
  fieldId: string,
  invalid: WaitlistField | undefined,
  field: WaitlistField
) {
  return invalid === field ? errorId(fieldId, field) : undefined
}

/** Submitting swaps the form out, so the confirmation takes focus: without it
 *  focus falls back to the document and a screen reader says nothing. */
function Joined() {
  const confirmation = useRef<HTMLDivElement>(null)

  useEffect(() => {
    confirmation.current?.focus()
  }, [])

  return (
    <div
      className="flex max-w-xl items-start gap-3 rounded-xl border bg-card p-5 outline-none"
      ref={confirmation}
      role="status"
      tabIndex={-1}
    >
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
