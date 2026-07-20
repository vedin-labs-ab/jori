import { useUser } from "@clerk/tanstack-react-start"
import {
  type DeliveryChoice,
  type DeliveryMode,
  type DeliveryOption,
  deliveryMode,
  type SlackDeliveryTarget,
} from "@contracts/playbooks/delivery"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { SlackChannelField } from "../target"
import { DeliveryIcon, DeliveryModeMenu } from "./menu"

type DeliveryDraft = {
  mode: DeliveryMode
  channel?: Extract<SlackDeliveryTarget, { kind: "channel" }>
}

type DeliveryFieldProps = {
  disabled?: boolean
  editing: boolean
  onChange: (choice: DeliveryChoice) => void
  onEditingChange: (editing: boolean) => void
  options: DeliveryOption[]
  organizationId: string
  value: DeliveryChoice | undefined
}

export function DeliveryField(props: DeliveryFieldProps) {
  const [draft, setDraft] = useState<DeliveryDraft>(() =>
    committedDraft(props.value, props.options)
  )

  if (!props.editing && props.value !== undefined) {
    return <DeliverySummary {...props} setDraft={setDraft} />
  }

  return (
    <DeliveryEditor
      {...props}
      draft={draft}
      onCancel={
        props.value === undefined
          ? undefined
          : () => props.onEditingChange(false)
      }
      onDraftChange={setDraft}
      onSave={(choice) => {
        props.onChange(choice)
        props.onEditingChange(false)
      }}
    />
  )
}

function DeliverySummary({
  disabled = false,
  onEditingChange,
  options,
  setDraft,
  value,
}: DeliveryFieldProps & {
  setDraft: (draft: DeliveryDraft) => void
}) {
  if (value === undefined) {
    return null
  }

  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <DeliveryIcon mode={deliveryMode(value)} />
        <DeliveryText choice={value} dmLabel={dmLabel(options)} />
      </span>
      {options.length > 1 ? (
        <Button
          disabled={disabled}
          onClick={() => {
            setDraft(committedDraft(value, options))
            onEditingChange(true)
          }}
          variant="ghost"
        >
          <Pencil /> Change
        </Button>
      ) : null}
    </div>
  )
}

function DeliveryEditor({
  disabled = false,
  draft,
  onCancel,
  onDraftChange,
  onSave,
  options,
  organizationId,
  value,
}: DeliveryFieldProps & {
  draft: DeliveryDraft
  onCancel: (() => void) | undefined
  onDraftChange: (draft: DeliveryDraft) => void
  onSave: (choice: DeliveryChoice) => void
}) {
  const next = draftChoice(draft)
  const changed =
    next !== undefined &&
    modeAvailable(options, draft.mode) &&
    !sameChoice(next, value)

  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <DeliveryModeMenu
          disabled={disabled}
          mode={draft.mode}
          onSelect={(mode) => onDraftChange({ ...draft, mode })}
          options={options}
        />
        {draft.mode === "channel" ? (
          <div className="min-w-0 flex-1">
            <SlackChannelField
              disabled={disabled}
              onChange={(target) =>
                onDraftChange({ ...draft, channel: target })
              }
              organizationId={organizationId}
              value={draft.channel}
            />
          </div>
        ) : (
          <DeliveryText
            choice={choiceForMode(draft.mode)}
            dmLabel={dmLabel(options)}
          />
        )}
      </div>
      <ButtonGroup>
        <Button
          disabled={disabled || onCancel === undefined}
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={disabled || !changed}
          onClick={() => next !== undefined && onSave(next)}
        >
          Save
        </Button>
      </ButtonGroup>
    </div>
  )
}

function DeliveryText({
  choice,
  dmLabel,
}: {
  choice: DeliveryChoice
  dmLabel: string | undefined
}) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress
  const mode = deliveryMode(choice)
  const target = choice.kind === "slack" ? choice.target : undefined

  return (
    <span className="truncate">
      {mode === "email"
        ? "Email"
        : mode === "channel"
          ? "Slack channel"
          : "Slack DM"}
      <span className="text-muted-foreground"> · </span>
      <span className="font-medium">
        {target === undefined
          ? (email ?? "you")
          : target.kind === "channel"
            ? `#${target.label}`
            : (dmLabel ?? "You")}
      </span>
    </span>
  )
}

/** The resolved Slack identity name carried on the dm option. */
function dmLabel(options: DeliveryOption[]) {
  return options.find((option) => option.mode === "dm")?.label
}

function committedDraft(
  value: DeliveryChoice | undefined,
  options: DeliveryOption[]
): DeliveryDraft {
  if (value === undefined) {
    return { mode: initialMode(options) }
  }

  if (value.kind === "email" || value.target.kind === "dm") {
    return { mode: deliveryMode(value) }
  }

  return { mode: "channel", channel: value.target }
}

function draftChoice(draft: DeliveryDraft): DeliveryChoice | undefined {
  if (draft.mode !== "channel") {
    return choiceForMode(draft.mode)
  }

  return draft.channel === undefined
    ? undefined
    : { kind: "slack", target: draft.channel }
}

function choiceForMode(mode: Exclude<DeliveryMode, "channel">): DeliveryChoice {
  return mode === "email"
    ? { kind: "email" }
    : { kind: "slack", target: { kind: "dm" } }
}

function initialMode(options: DeliveryOption[]): DeliveryMode {
  return (
    options.find((option) => option.available)?.mode ??
    options[0]?.mode ??
    "email"
  )
}

function modeAvailable(options: DeliveryOption[], mode: DeliveryMode) {
  return options.find((option) => option.mode === mode)?.available === true
}

function sameChoice(
  next: DeliveryChoice,
  committed: DeliveryChoice | undefined
) {
  if (committed === undefined || next.kind !== committed.kind) {
    return false
  }

  if (next.kind === "email") {
    return true
  }

  if (next.target.kind === "dm") {
    return committed.kind === "slack" && committed.target.kind === "dm"
  }

  return (
    committed.kind === "slack" &&
    committed.target.kind === "channel" &&
    next.target.id === committed.target.id
  )
}
