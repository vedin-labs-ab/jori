import { type Region } from "@contracts/region"
import {
  readWaitlistEntry,
  teamSizeLabels,
  teamSizes,
  type WaitlistField,
  waitlistLimits,
} from "@contracts/waitlist"
import { Check, Lock } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { FieldHelp } from "@/shared/field"
import { regionConfig } from "@/shared/region/config"
import { RegionPicker } from "@/shared/region/picker"
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

/**
 * `lockedEmail` binds the form to a signed-in account. The address submitted
 * here is the one that gets admitted, and admission is matched against the
 * account someone signs in with, so letting them type a different address
 * would quietly guarantee that admitting them does not work.
 */
export function WaitlistForm({ lockedEmail }: { lockedEmail?: string }) {
  const fieldId = useId()
  const form = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [rejection, setRejection] = useState<Rejection>()
  const [region, setRegion] = useState(regionConfig.current)

  useRejectionFocus(form, fieldId, rejection)

  if (status === "joined") {
    return <Joined />
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const fields = readFields(event.currentTarget, lockedEmail)
    const checked = readWaitlistEntry(fields)

    // The server validates too, and is the authority. Running the same
    // contract here first means a typo answers in the same frame instead of
    // after a round trip, and never spends a slice of the caller's rate
    // limit on something both sides already know is wrong.
    if ("rejection" in checked) {
      setRejection({ kind: "field", ...checked.rejection })

      return
    }

    setStatus("submitting")
    setRejection(undefined)

    const outcome = await requestSpot(
      fields,
      lockedEmail === undefined ? region : regionConfig.current
    )

    setRejection(outcome)
    setStatus(outcome === undefined ? "joined" : "idle")
  }

  const invalid = rejection?.kind === "field" ? rejection.field : undefined

  return (
    <form
      className="grid max-w-xl gap-4"
      noValidate
      onInput={() => setRejection(undefined)}
      onSubmit={submit}
      ref={form}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <EmailField
          fieldId={fieldId}
          invalid={invalid}
          lockedEmail={lockedEmail}
          rejection={rejection}
        />
        <SizeField fieldId={fieldId} invalid={invalid} rejection={rejection} />
      </div>
      <WorkField fieldId={fieldId} invalid={invalid} rejection={rejection} />
      {lockedEmail === undefined ? (
        <RegionPicker
          layout="field"
          value={region}
          onChange={setRegion}
          disabled={status === "submitting"}
        />
      ) : null}
      <Honeypot />
      {/* A rejection appears where it belongs and pushes what follows;
          reserving its line under every field spread the form out more
          than the message ever would. */}
      <div className="grid justify-items-start gap-3 pt-1">
        <Button disabled={status === "submitting"} type="submit">
          {status === "submitting" ? <Spinner /> : null}
          Join the waitlist
        </Button>
        {rejection?.kind === "form" ? (
          <FieldError>{rejection.message}</FieldError>
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

function EmailField({
  fieldId,
  invalid,
  lockedEmail,
  rejection,
}: FieldProps & { lockedEmail?: string }) {
  if (lockedEmail !== undefined) {
    return (
      <Field>
        <FieldLabel className="gap-1.5" htmlFor={`${fieldId}-email`}>
          Work email
          <FieldHelp icon={Lock} label="Why this address is fixed">
            We open Jori for the account you sign in with, so this is the
            address that gets in. Sign out to use another.
          </FieldHelp>
        </FieldLabel>
        <Input
          defaultValue={lockedEmail}
          id={`${fieldId}-email`}
          name="email"
          readOnly
          type="email"
        />
      </Field>
    )
  }

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
        className="min-h-28 sm:min-h-20"
        id={`${fieldId}-work`}
        maxLength={waitlistLimits.work}
        name="work"
        placeholder="The release checklist. Someone reads every PR and Linear issue on Thursday and writes up what's ready."
        required
        rows={5}
      />
      <FieldError id={errorId(fieldId, "work")}>
        {fieldMessage(rejection, "work")}
      </FieldError>
    </Field>
  )
}

type Fields = {
  company: string
  email: string
  size: string
  work: string
}

/** A locked address comes from the session, not the field, so a readonly
 *  input cannot be edited around. */
function readFields(form: HTMLFormElement, lockedEmail?: string): Fields {
  const data = new FormData(form)

  return {
    company: String(data.get("company") ?? ""),
    email: lockedEmail ?? String(data.get("email") ?? ""),
    size: String(data.get("size") ?? ""),
    work: String(data.get("work") ?? ""),
  }
}

/** One round trip, reduced to what the form does next: a rejection to show,
 *  or nothing left to say. */
async function requestSpot(fields: Fields, region: Region) {
  const result = await joinWaitlist(fields, region).catch(
    () => ({ status: "failed" }) as const
  )

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

/**
 * Submitting disables the button focus was sitting on, so a rejection that
 * left focus where it found it would drop it to the document and start the
 * keyboard over at the top of the page.
 *
 * A named field takes focus, because that is where the fix is, and arriving
 * there reads the label and the reason together. Anything else goes back to
 * the button that will be pressed again. It waits for the commit rather than
 * moving focus from the submit handler, because until the button is enabled
 * again nothing can focus it.
 */
function useRejectionFocus(
  form: React.RefObject<HTMLFormElement | null>,
  fieldId: string,
  rejection: Rejection | undefined
) {
  useEffect(() => {
    if (form.current === null || rejection === undefined) {
      return
    }

    const target =
      rejection.kind === "field"
        ? document.getElementById(`${fieldId}-${rejection.field}`)
        : form.current.querySelector("button[type=submit]")

    if (target instanceof HTMLElement) {
      target.focus()
    }
  }, [fieldId, form, rejection])
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
        {/* The confirmation email invites no reply, because Jori sends from a
            subdomain with no mailbox behind it. Offering one here would be the
            same dead end one screen earlier. */}
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          Check your inbox for a confirmation. We set each team up ourselves, so
          you'll hear from us directly when yours is next.
        </p>
      </div>
    </div>
  )
}
