import { useUser } from "@clerk/tanstack-react-start"
import {
  type DeliveryChoice,
  type DeliveryKind,
  deliveryKindLabels,
} from "@contracts/playbooks/delivery"
import { ChevronDown, Mail, Pencil } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SurfaceLogo } from "../automations/access/logo"
import { type SlackChannel, SlackChannelField } from "./channel"

type DeliveryDraft = { kind: DeliveryKind; channel?: SlackChannel }

/**
 * The delivery target as a single summary line. "Change" flips it into edit
 * mode — kind picker on the icon slot, input inline — and only a valid draft
 * that differs from the committed `value` can be saved back. The parent owns
 * the `editing` flag so it can hold submissions while an edit is open.
 */
export function DeliveryField({
  availableKinds,
  defaultKind,
  editing,
  onChange,
  onEditingChange,
  tenantId,
  value,
}: {
  availableKinds: DeliveryKind[]
  defaultKind: DeliveryKind
  editing: boolean
  onChange: (choice: DeliveryChoice) => void
  onEditingChange: (editing: boolean) => void
  tenantId: string
  value: DeliveryChoice | undefined
}) {
  const [draft, setDraft] = useState<DeliveryDraft>(() =>
    committedDraft(value, defaultKind)
  )

  if (!editing && value !== undefined) {
    return (
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <DeliveryIcon kind={value.kind} />
          <DeliveryText choice={value} />
        </span>
        {availableKinds.length > 1 ? (
          <Button
            onClick={() => {
              setDraft(committedDraft(value, defaultKind))
              onEditingChange(true)
            }}
            size="sm"
            variant="outline"
          >
            <Pencil /> Change
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <DeliveryEditor
      availableKinds={availableKinds}
      draft={draft}
      onCancel={value === undefined ? undefined : () => onEditingChange(false)}
      onDraftChange={setDraft}
      onSave={(choice) => {
        onChange(choice)
        onEditingChange(false)
      }}
      onSwitchKind={(kind) =>
        setDraft(
          kind === value?.kind ? committedDraft(value, defaultKind) : { kind }
        )
      }
      tenantId={tenantId}
      value={value}
    />
  )
}

function DeliveryEditor({
  availableKinds,
  draft,
  onCancel,
  onDraftChange,
  onSave,
  onSwitchKind,
  tenantId,
  value,
}: {
  availableKinds: DeliveryKind[]
  draft: DeliveryDraft
  onCancel: (() => void) | undefined
  onDraftChange: (draft: DeliveryDraft) => void
  onSave: (choice: DeliveryChoice) => void
  onSwitchKind: (kind: DeliveryKind) => void
  tenantId: string
  value: DeliveryChoice | undefined
}) {
  const next = draftChoice(draft)
  const changed = next !== undefined && !sameChoice(next, value)

  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <KindMenu
          kind={draft.kind}
          kinds={availableKinds}
          onSelect={onSwitchKind}
        />
        {draft.kind === "email" ? (
          <DeliveryText choice={{ kind: "email" }} />
        ) : (
          <div className="min-w-0 flex-1">
            <SlackChannelField
              onChange={(channel) =>
                onDraftChange({ kind: draft.kind, channel })
              }
              tenantId={tenantId}
              value={draft.channel}
            />
          </div>
        )}
      </div>
      <ButtonGroup>
        <Button
          disabled={onCancel === undefined}
          onClick={onCancel}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={!changed}
          onClick={() => {
            if (next !== undefined) {
              onSave(next)
            }
          }}
          size="sm"
        >
          Save
        </Button>
      </ButtonGroup>
    </div>
  )
}

/** The edit-mode icon slot: the kind picker when there is more than one. */
function KindMenu({
  kind,
  kinds,
  onSelect,
}: {
  kind: DeliveryKind
  kinds: DeliveryKind[]
  onSelect: (kind: DeliveryKind) => void
}) {
  if (kinds.length < 2) {
    return <DeliveryIcon kind={kind} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Delivery kind"
          className="px-2"
          size="sm"
          variant="outline"
        >
          <DeliveryIcon kind={kind} />
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {kinds.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onSelect(option)}>
            <DeliveryIcon kind={option} />
            {deliveryKindLabels[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** "Kind · target", the target weighted so it reads as the answer. */
function DeliveryText({ choice }: { choice: DeliveryChoice }) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress

  return (
    <span className="truncate">
      {deliveryKindLabels[choice.kind]}
      <span className="text-muted-foreground"> · </span>
      <span className="font-medium">
        {choice.kind === "email" ? (email ?? "you") : `#${choice.channelName}`}
      </span>
    </span>
  )
}

function DeliveryIcon({ kind }: { kind: DeliveryKind }) {
  if (kind === "email") {
    return <Mail className="size-3.5 shrink-0 text-muted-foreground" />
  }

  return <SurfaceLogo alt="" integration="slack" />
}

function committedDraft(
  value: DeliveryChoice | undefined,
  defaultKind: DeliveryKind
): DeliveryDraft {
  if (value === undefined) {
    return { kind: defaultKind }
  }

  if (value.kind === "email") {
    return { kind: "email" }
  }

  return {
    kind: "slack",
    channel: { channelId: value.channelId, channelName: value.channelName },
  }
}

function draftChoice(draft: DeliveryDraft): DeliveryChoice | undefined {
  if (draft.kind === "email") {
    return { kind: "email" }
  }

  return draft.channel === undefined
    ? undefined
    : { kind: "slack", ...draft.channel }
}

function sameChoice(
  next: DeliveryChoice,
  committed: DeliveryChoice | undefined
): boolean {
  if (committed === undefined) {
    return false
  }

  if (next.kind === "email") {
    return committed.kind === "email"
  }

  return committed.kind === "slack" && committed.channelId === next.channelId
}
