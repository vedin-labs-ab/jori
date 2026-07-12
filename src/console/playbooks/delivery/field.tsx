import { useUser } from "@clerk/tanstack-react-start"
import {
  type DeliveryChoice,
  type DeliveryKind,
  type SlackDeliveryTarget,
} from "@contracts/playbooks/delivery"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { SlackTargetField } from "../target"
import { DeliveryIcon, DeliveryModeMenu } from "./menu"
import { type DeliveryMode, deliveryModeCount } from "./model"

type DeliveryDraft = {
  mode: DeliveryMode
  channel?: Extract<SlackDeliveryTarget, { kind: "channel" }>
  dm?: Extract<SlackDeliveryTarget, { kind: "dm" }>
}

type DeliveryFieldProps = {
  availableKinds: DeliveryKind[]
  defaultKind: DeliveryKind
  disabled?: boolean
  editing: boolean
  onChange: (choice: DeliveryChoice) => void
  onEditingChange: (editing: boolean) => void
  tenantId: string
  value: DeliveryChoice | undefined
}

export function DeliveryField(props: DeliveryFieldProps) {
  const [draft, setDraft] = useState<DeliveryDraft>(() =>
    committedDraft(props.value, props.defaultKind)
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
  availableKinds,
  defaultKind,
  disabled = false,
  onEditingChange,
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
        <DeliveryIcon mode={choiceMode(value)} />
        <DeliveryText choice={value} />
      </span>
      {deliveryModeCount(availableKinds) > 1 ? (
        <Button
          disabled={disabled}
          onClick={() => {
            setDraft(committedDraft(value, defaultKind))
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
  availableKinds,
  disabled = false,
  draft,
  onCancel,
  onDraftChange,
  onSave,
  tenantId,
  value,
}: DeliveryFieldProps & {
  draft: DeliveryDraft
  onCancel: (() => void) | undefined
  onDraftChange: (draft: DeliveryDraft) => void
  onSave: (choice: DeliveryChoice) => void
}) {
  const next = draftChoice(draft)
  const changed = next !== undefined && !sameChoice(next, value)

  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <DeliveryModeMenu
          disabled={disabled}
          kinds={availableKinds}
          mode={draft.mode}
          onSelect={(mode) => onDraftChange({ ...draft, mode })}
        />
        {draft.mode === "email" ? (
          <DeliveryText choice={{ kind: "email" }} />
        ) : (
          <div className="min-w-0 flex-1">
            <SlackTargetField
              disabled={disabled}
              kind={draft.mode}
              onChange={(target) =>
                onDraftChange({ ...draft, [draft.mode]: target })
              }
              tenantId={tenantId}
              value={draft[draft.mode]}
            />
          </div>
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

function DeliveryText({ choice }: { choice: DeliveryChoice }) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress
  const mode = choiceMode(choice)
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
            : target.label}
      </span>
    </span>
  )
}

function committedDraft(
  value: DeliveryChoice | undefined,
  defaultKind: DeliveryKind
): DeliveryDraft {
  if (value === undefined || value.kind === "email") {
    return {
      mode:
        value === undefined && defaultKind === "slack" ? "channel" : "email",
    }
  }

  return { mode: value.target.kind, [value.target.kind]: value.target }
}

function draftChoice(draft: DeliveryDraft): DeliveryChoice | undefined {
  if (draft.mode === "email") {
    return { kind: "email" }
  }

  const target = draft[draft.mode]

  return target === undefined ? undefined : { kind: "slack", target }
}

function choiceMode(choice: DeliveryChoice): DeliveryMode {
  return choice.kind === "email" ? "email" : choice.target.kind
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

  return (
    committed.kind === "slack" &&
    next.target.kind === committed.target.kind &&
    next.target.id === committed.target.id
  )
}
