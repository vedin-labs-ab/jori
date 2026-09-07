import { type ModelSlug } from "@contracts/models/catalog"
import { type ModelSelection } from "@contracts/models/selection"
import { ArrowUp, ChevronDown, Square } from "lucide-react"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { SigilHints } from "../../mentions/hints"
import {
  type MentionSources,
  type MentionSuggestion,
} from "../../mentions/sources"
import { ContextIndicator } from "../context"
import { ModelPicker } from "../models"
import { type ChatContextUsage } from "../types"
import { AttachMenu } from "./attach"

const sigilHints = [
  { kind: "resource", label: "resources" },
  { kind: "integration", label: "integrations" },
  { kind: "skill", label: "skills" },
  { kind: "tool", label: "tools" },
] as const

/** Under the field: the "+" on the left, or the reason the field is
 *  disabled; the model, the ring, and the send or stop control on the
 *  right — a spinner in the send's place while a send is on its way; and
 *  under them, on the quiet band the job field has, the sigils, while
 *  the person keeps the band open. */
export function ComposerFooter({
  availableModels,
  canSend,
  hintsId,
  isLive,
  mentions,
  onPick,
  onSelect,
  onHideHints,
  onStop,
  pending,
  reason,
  selection,
  usage,
}: {
  availableModels: readonly ModelSlug[] | undefined
  canSend: boolean
  /** The band's id, for the controls that open and close it. */
  hintsId: string
  isLive: boolean
  mentions: MentionSources
  onPick: (suggestion: MentionSuggestion) => void
  onSelect: ((selection: ModelSelection) => void) | undefined
  onStop: () => void
  /** Set while the band shows; folds it away. */
  onHideHints: (() => void) | undefined
  /** A send the host is still answering. */
  pending: boolean
  reason: { id: string; text: string } | undefined
  selection: ModelSelection | undefined
  usage: ChatContextUsage | null | undefined
}) {
  return (
    <>
      <InputGroupAddon align="block-end" className="justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          {reason === undefined ? (
            <AttachMenu onPick={onPick} sources={mentions} />
          ) : (
            <span
              className="min-w-0 truncate text-muted-foreground text-xs"
              id={reason.id}
            >
              {reason.text}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {selection === undefined || onSelect === undefined ? null : (
            <ModelPicker
              availableModels={availableModels}
              onSelect={onSelect}
              selection={selection}
            />
          )}
          {usage === undefined || usage === null ? null : (
            <ContextIndicator usage={usage} />
          )}
          <SendControl
            canSend={canSend}
            isLive={isLive}
            onStop={onStop}
            pending={pending}
          />
        </span>
      </InputGroupAddon>
      {/* The sigils on the quiet band the job field has, where a phone's
          keyboard would only cover them; a click folds the band away. */}
      {reason === undefined && onHideHints !== undefined ? (
        <button
          aria-controls={hintsId}
          aria-expanded="true"
          aria-label="Hide shortcuts"
          className="order-last hidden w-full cursor-pointer items-center justify-between gap-2 rounded-b-[inherit] border-t bg-muted/30 px-2 py-1.5 text-muted-foreground text-xs outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 md:flex"
          onClick={onHideHints}
          type="button"
        >
          <SigilHints hints={sigilHints} id={hintsId} />
          <ChevronDown aria-hidden className="size-3 shrink-0" />
        </button>
      ) : null}
    </>
  )
}

/** The footer's last control: the stop while a run is live, the spinner
 *  while a send is on its way, the send otherwise. One box for all
 *  three, so nothing beside it moves. */
function SendControl({
  canSend,
  isLive,
  onStop,
  pending,
}: {
  canSend: boolean
  isLive: boolean
  onStop: () => void
  pending: boolean
}) {
  if (isLive) {
    return (
      <InputGroupButton
        aria-label="Stop run"
        onClick={onStop}
        size="icon-sm"
        variant="default"
      >
        <Square className="fill-current" />
      </InputGroupButton>
    )
  }

  if (pending) {
    return (
      <span className="grid size-7 place-items-center text-muted-foreground">
        <Spinner aria-label="Sending" />
      </span>
    )
  }

  return (
    <InputGroupButton
      aria-label="Send message"
      disabled={!canSend}
      size="icon-sm"
      type="submit"
      variant="default"
    >
      <ArrowUp />
    </InputGroupButton>
  )
}

/** The band folded away: a sliver tucked under the frame, the way a
 *  card shows under the one on top of it, that brings the band back. The
 *  sliver is all that shows; the control around it reaches above and
 *  below, taking no room of its own, so a finger finds it. */
export function HintsPeek({
  hintsId,
  onShow,
}: {
  hintsId: string
  onShow: () => void
}) {
  return (
    <button
      aria-controls={hintsId}
      aria-expanded="false"
      aria-label="Show shortcuts"
      className="group/peek -my-2 mx-auto hidden w-[calc(100%-1.5rem)] cursor-pointer py-2 outline-none md:block"
      onClick={onShow}
      type="button"
    >
      <span className="block h-1.5 rounded-b-md border border-t-0 bg-muted/40 transition-[height,background-color] group-focus-visible/peek:h-2.5 group-focus-visible/peek:ring-2 group-focus-visible/peek:ring-ring group-hover/peek:h-2.5 group-hover/peek:bg-muted" />
    </button>
  )
}
