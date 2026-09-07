import { type ModelSelection } from "@contracts/models/selection"
import { ArrowUp, ChevronDown, Square } from "lucide-react"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
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
 *  right; and under them, on the quiet band the job field has, the
 *  sigils, while the person keeps the band open. */
export function ComposerFooter({
  canSend,
  isLive,
  mentions,
  onPick,
  onSelect,
  onHideHints,
  onStop,
  reason,
  selection,
  usage,
}: {
  canSend: boolean
  isLive: boolean
  mentions: MentionSources
  onPick: (suggestion: MentionSuggestion) => void
  onSelect: ((selection: ModelSelection) => void) | undefined
  onStop: () => void
  /** Set while the band shows; folds it away. */
  onHideHints: (() => void) | undefined
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
            <ModelPicker onSelect={onSelect} selection={selection} />
          )}
          {usage === undefined || usage === null ? null : (
            <ContextIndicator usage={usage} />
          )}
          {isLive ? (
            <InputGroupButton
              aria-label="Stop run"
              onClick={onStop}
              size="icon-sm"
              variant="default"
            >
              <Square className="fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              aria-label="Send message"
              disabled={!canSend}
              size="icon-sm"
              type="submit"
              variant="default"
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </span>
      </InputGroupAddon>
      {/* The sigils on the quiet band the job field has, where a phone's
          keyboard would only cover them; a click folds the band away. */}
      {reason === undefined && onHideHints !== undefined ? (
        <button
          aria-expanded="true"
          aria-label="Hide shortcuts"
          className="order-last hidden w-full cursor-pointer items-center justify-between gap-2 border-t bg-muted/30 px-2 py-1.5 text-muted-foreground text-xs outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 md:flex"
          onClick={onHideHints}
          type="button"
        >
          <SigilHints hints={sigilHints} />
          <ChevronDown aria-hidden className="size-3 shrink-0" />
        </button>
      ) : null}
    </>
  )
}

/** The band folded away: a sliver tucked under the frame, the way a
 *  card shows under the one on top of it, that brings the band back. */
export function HintsPeek({ onShow }: { onShow: () => void }) {
  return (
    <button
      aria-expanded="false"
      aria-label="Show shortcuts"
      className="mx-auto hidden h-1.5 w-[calc(100%-1.5rem)] cursor-pointer rounded-b-md border border-t-0 bg-muted/40 outline-none transition-[height,background-color] hover:h-2.5 hover:bg-muted focus-visible:h-2.5 focus-visible:ring-2 focus-visible:ring-ring/30 md:block"
      onClick={onShow}
      type="button"
    />
  )
}
