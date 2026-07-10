import { useUser } from "@clerk/tanstack-react-start"
import {
  type DeliveryChoice,
  type DeliveryKind,
  deliveryKindLabels,
} from "@contracts/playbooks/delivery"
import { Mail, Pencil } from "lucide-react"
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
 * The delivery target as a single summary line. "Change" offers the other
 * kinds; picking one flips the line into edit mode, and only a valid draft
 * saved back commits — `value` always holds the last committed choice.
 */
export function DeliveryField({
  availableKinds,
  defaultKind,
  onChange,
  tenantId,
  value,
}: {
  availableKinds: DeliveryKind[]
  defaultKind: DeliveryKind
  onChange: (choice: DeliveryChoice) => void
  tenantId: string
  value: DeliveryChoice | undefined
}) {
  const [draft, setDraft] = useState<DeliveryDraft | undefined>(
    value === undefined ? { kind: defaultKind } : undefined
  )

  if (draft === undefined && value !== undefined) {
    return (
      <div className="flex min-h-8 items-center justify-between gap-2">
        <DeliveryTarget choice={value} />
        {availableKinds.length > 1 ? (
          <ChangeMenu
            kinds={availableKinds}
            onSelect={(kind) => setDraft({ kind })}
          />
        ) : null}
      </div>
    )
  }

  const active = draft ?? { kind: defaultKind }
  const next = draftChoice(active)

  return (
    <div className="flex min-h-8 items-center justify-between gap-2">
      {active.kind === "email" ? (
        <DeliveryTarget choice={{ kind: "email" }} />
      ) : (
        <div className="flex flex-1 items-center gap-1.5">
          <DeliveryIcon kind={active.kind} />
          <div className="min-w-0 flex-1">
            <SlackChannelField
              onChange={(channel) => setDraft({ kind: active.kind, channel })}
              tenantId={tenantId}
              value={active.channel}
            />
          </div>
        </div>
      )}
      <ButtonGroup>
        <Button
          disabled={value === undefined}
          onClick={() => setDraft(undefined)}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={next === undefined}
          onClick={() => {
            if (next !== undefined) {
              onChange(next)
              setDraft(undefined)
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

/** Icon + "Kind · target" summary, shared by display and email edit rows. */
function DeliveryTarget({ choice }: { choice: DeliveryChoice }) {
  const email = useUser().user?.primaryEmailAddress?.emailAddress

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <DeliveryIcon kind={choice.kind} />
      <span className="truncate">
        {deliveryKindLabels[choice.kind]}
        <span className="text-muted-foreground"> · </span>
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

function ChangeMenu({
  kinds,
  onSelect,
}: {
  kinds: DeliveryKind[]
  onSelect: (kind: DeliveryKind) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil /> Change
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {kinds.map((kind) => (
          <DropdownMenuItem key={kind} onSelect={() => onSelect(kind)}>
            <DeliveryIcon kind={kind} />
            {deliveryKindLabels[kind]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function draftChoice(draft: DeliveryDraft): DeliveryChoice | undefined {
  if (draft.kind === "email") {
    return { kind: "email" }
  }

  return draft.channel === undefined
    ? undefined
    : { kind: "slack", ...draft.channel }
}
