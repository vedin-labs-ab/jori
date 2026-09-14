import { type ModelSlug } from "@contracts/models/catalog"
import { type ModelSelection } from "@contracts/models/selection"
import { ArrowUp, ChevronDown, Square } from "lucide-react"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
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

/** Under the field: the "+" on the left; the model, the ring, and the
 *  send or stop control on the
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
  selection: ModelSelection | undefined
  usage: ChatContextUsage | null | undefined
}) {
  return (
    <>
      <InputGroupAddon align="block-end" className="justify-between gap-2">
        <span className="flex min-h-7 min-w-0 items-center gap-1">
          <AttachMenu onPick={onPick} sources={mentions} />
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
          {isLive ? (
            <InputGroupButton
              aria-label="Stop run"
              onClick={onStop}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Square className="fill-current" />
            </InputGroupButton>
          ) : null}
          <SendControl canSend={canSend} pending={pending} />
        </span>
      </InputGroupAddon>
      {/* The sigils on the quiet band the job field has, where a phone's
          keyboard would only cover them; a click folds the band away. */}
      <div
        aria-hidden={onHideHints === undefined}
        className={cn(
          "order-last hidden w-full rounded-b-[inherit] transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:grid",
          onHideHints === undefined
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        )}
        inert={onHideHints === undefined}
      >
        <div className="min-h-0 overflow-hidden rounded-b-[inherit]">
          <button
            aria-controls={hintsId}
            aria-expanded={onHideHints !== undefined}
            aria-label="Hide shortcuts"
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-b-[inherit] border-t bg-muted/30 px-2 py-1.5 text-muted-foreground text-xs outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 motion-reduce:transition-none"
            disabled={onHideHints === undefined}
            onClick={onHideHints}
            type="button"
          >
            <SigilHints hints={sigilHints} id={hintsId} />
            <ChevronDown aria-hidden className="size-3 shrink-0" />
          </button>
        </div>
      </div>
    </>
  )
}

/** The last control sends a message, or holds its place while it lands. */
function SendControl({
  canSend,
  pending,
}: {
  canSend: boolean
  pending: boolean
}) {
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
  onShow: (() => void) | undefined
}) {
  const visible = onShow !== undefined

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "hidden transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:grid",
        visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
      inert={!visible}
    >
      <div className="flow-root min-h-0">
        <button
          aria-controls={hintsId}
          aria-expanded="false"
          aria-label="Show shortcuts"
          className="group/peek -my-2 mx-auto block w-[calc(100%-1.5rem)] cursor-pointer py-2 outline-none"
          disabled={!visible}
          onClick={onShow}
          type="button"
        >
          <span className="block h-1.5 rounded-b-md border border-t-0 bg-muted/40 transition-[height,background-color] group-focus-visible/peek:h-2.5 group-focus-visible/peek:ring-2 group-focus-visible/peek:ring-ring group-hover/peek:h-2.5 group-hover/peek:bg-muted motion-reduce:transition-none" />
        </button>
      </div>
    </div>
  )
}
