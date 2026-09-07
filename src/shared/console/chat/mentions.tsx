import { integrationLabel } from "@contracts/integrations"
import { cn } from "@/lib/utils"
import { MentionChip } from "../mentions/chip"
import { MentionKindIcon } from "../mentions/icon"
import { type MentionKind, parseResourceMention } from "../mentions/scan"
import { mentionTones } from "../mentions/tone"
import { referencePresentation } from "./presentation"
import { type ReferenceTarget, type ResolveReference, targetKey } from "./types"

/** One of a chat's mentions as a chip, in the composer and in the thread
 *  alike: a resource by the name the host resolves it to, or as its kind
 *  when the host cannot, struck through and said to be gone; a skill, a
 *  tool, or an integration by name. In the composer the chip can be
 *  removed; in a message a resource opens beside the chat. */
export function ChatMentionChip({
  id,
  kind,
  onOpen,
  onRemove,
  resolve,
  selected,
}: {
  id: string
  kind: MentionKind
  onOpen?: (target: ReferenceTarget) => void
  onRemove?: () => void
  resolve: ResolveReference | undefined
  selected?: boolean
}) {
  if (kind === "resource") {
    return (
      <ResourceMentionChip
        id={id}
        onOpen={onOpen}
        onRemove={onRemove}
        resolve={resolve}
        selected={selected}
      />
    )
  }

  return (
    <MentionChip
      icon={
        <MentionKindIcon
          className={cn("size-3", mentionTones[kind].icon)}
          id={id}
          kind={kind}
        />
      }
      kind={kind}
      label={kind === "integration" ? integrationLabel(id) : id}
      onRemove={onRemove}
      selected={selected}
    />
  )
}

function ResourceMentionChip({
  id,
  onOpen,
  onRemove,
  resolve,
  selected,
}: {
  id: string
  onOpen: ((target: ReferenceTarget) => void) | undefined
  onRemove: (() => void) | undefined
  resolve: ResolveReference | undefined
  selected: boolean | undefined
}) {
  const target = parseResourceMention(id)

  if (target === null) {
    return null
  }

  const reference = resolve?.(target)
  const unavailable = reference === undefined || reference.unavailable === true
  const presentation = referencePresentation(target.kind, reference?.name ?? "")
  const Icon = presentation.icon

  return (
    <MentionChip
      className={cn(unavailable && "text-muted-foreground line-through")}
      data-mention-target={targetKey(target)}
      icon={
        <Icon
          aria-hidden="true"
          className={cn(
            "size-3",
            unavailable ? "text-muted-foreground" : mentionTones.resource.icon
          )}
        />
      }
      kind="resource"
      label={reference?.name ?? presentation.label}
      onOpen={
        onOpen === undefined || unavailable ? undefined : () => onOpen(target)
      }
      onRemove={onRemove}
      selected={selected}
      title={unavailable ? "No longer available" : presentation.label}
      trailing={
        unavailable ? (
          <span className="sr-only">(no longer available)</span>
        ) : undefined
      }
    />
  )
}
